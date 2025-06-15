---
author: Sy Brand
pubDatetime: 2017-05-06
title: "Writing a Linux Debugger Part 6: Source-Level Stepping"
draft: false
tags:
  - Debuggers
  - Writing a Linux Debugger
canonicalURL: https://tartanllama.xyz/posts/writing-a-linux-debugger/source-level-stepping
description: Adding step over, out, and in support to the debugger
---

_This series has been expanded into a book! It covers many more topics in much greater detail, written entirely from scratch. You can buy [Building a Debugger](https://nostarch.com/building-a-debugger) now._

---

## Series index

1. [Setup](/posts/writing-a-linux-debugger/setup)
2. [Breakpoints](/posts/writing-a-linux-debugger/breakpoints)
3. [Registers and Memory](/posts/writing-a-linux-debugger/registers-and-memory)
4. [Elves and Dwarves](/posts/writing-a-linux-debugger/elves-and-dwarves)
5. [Source and Signals](/posts/writing-a-linux-debugger/source-and-signals)
6. [Source-Level Stepping](/posts/writing-a-linux-debugger/source-level-stepping)
7. [Source-Level Breakpoints](/posts/writing-a-linux-debugger/source-level-breakpoints)
8. [Stack Unwinding](/posts/writing-a-linux-debugger/stack-unwinding)
9. [Handling Variables](/posts/writing-a-linux-debugger/handling-variables)
10. [Advanced Topics](/posts/writing-a-linux-debugger/advanced-topics)

---

A couple of posts ago we learned about DWARF information and how it lets us relate the machine code to the high-level source. This time we'll be putting this knowledge into practice by adding source-level stepping to our debugger.

## Exposing Instruction-Level Stepping

But we're getting ahead of ourselves. First let's expose instruction-level single stepping through the user interface. I decided to split it between a `single_step_instruction` which can be used by other parts of the code, and a `single_step_instruction_with_breakpoint_check` which ensures that any breakpoints are disabled and re-enabled.

```cpp
void debugger::single_step_instruction() {
    ptrace(PTRACE_SINGLESTEP, m_pid, nullptr, nullptr);
    wait_for_signal();
}

void debugger::single_step_instruction_with_breakpoint_check() {
    //first, check to see if we need to disable and enable a breakpoint
    if (m_breakpoints.count(get_pc())) {
        step_over_breakpoint();
    }
    else {
        single_step_instruction();
    }
}
```

As usual, another command gets lumped into our `handle_command` function:

```cpp
else if(is_prefix(command, "stepi")) {
    single_step_instruction_with_breakpoint_check();
    auto line_entry = get_line_entry_from_pc(get_pc());
    print_source(line_entry->file->path, line_entry->line);
 }
```

With these functions added we can begin to implement our source-level stepping functions.

## Implementing the Steps

We're going to write very pared-down versions of these functions, but real debuggers tend to have the concept of a _thread plan_ which encapsulates all of the stepping information. For example, a debugger might have some complex logic to determine breakpoint sites, then have some callback which determines whether or not the step operation has completed. This is a lot of infrastructure to get in place, so we'll take a naive approach. We might end up accidentally stepping over breakpoints, but you can spend some time getting all the details right if you like.

For `step_out`, we'll set a breakpoint at the return address of the function and continue. I don't want to get into the details of stack unwinding yet -- that'll come in a later part -- but it suffices to say for now that the return address is stored 8 bytes after the start of a stack frame. So we'll read the frame pointer and read a word of memory at the relevant address:

```cpp
void debugger::step_out() {
    auto frame_pointer = get_register_value(m_pid, reg::rbp);
    auto return_address = read_memory(frame_pointer+8);

    bool should_remove_breakpoint = false;
    if (!m_breakpoints.count(return_address)) {
        set_breakpoint_at_address(return_address);
        should_remove_breakpoint = true;
    }

    continue_execution();

    if (should_remove_breakpoint) {
        remove_breakpoint(return_address);
    }
}
```

`remove_breakpoint` is a little helper function:

```cpp
void debugger::remove_breakpoint(std::intptr_t addr) {
    if (m_breakpoints.at(addr).is_enabled()) {
        m_breakpoints.at(addr).disable();
    }
    m_breakpoints.erase(addr);
}
```

Next is `step_in`. A simple algorithm is to just keep on stepping over instructions until we get to a new line.

```cpp
void debugger::step_in() {
   auto line = get_line_entry_from_pc(get_offset_pc())->line;

   while (get_line_entry_from_pc(get_offset_pc())->line == line) {
      single_step_instruction_with_breakpoint_check();
   }

   auto line_entry = get_line_entry_from_pc(get_offset_pc());
   print_source(line_entry->file->path, line_entry->line);
}

uint64_t debugger::get_offset_pc() {
   return offset_load_address(get_pc());
}
```

`step_over` is the most difficult of the three for us. Conceptually, the solution is to set a breakpoint at the next source line, but what is the next source line? It might not be the one directly succeeding the current line, as we could be in a loop, or some conditional construct. Real debuggers will often examine what instruction is being executed and work out all of the possible branch targets, then set breakpoints on all of them. I'd rather not implement or integrate an x86 instruction emulator for such a small project, so we'll need to come up with a simpler solution. A couple of horrible options are to keep stepping until we're at a new line in the current function, or to set a breakpoint at every line in the current function. The former would be ridiculously inefficient if we're stepping over a function call, as we'd need to single step through every single instruction in that call graph, so I'll go for the second solution.

First we'll need a helper to offset addresses from DWARF info by the load address:

```cpp
uint64_t debugger::offset_dwarf_address(uint64_t addr) {
   return addr + m_load_address;
}
```

Now we can write our stepper. This function is a bit more complex, so I'll break it down a bit.

```cpp
void debugger::step_over() {
    auto func = get_function_from_pc(get_offset_pc());
    auto func_entry = at_low_pc(func);
    auto func_end = at_high_pc(func);
```

`at_low_pc` and `at_high_pc` are functions from `libelfin` which will get us the low and high PC values for the given function DIE.

```cpp
    auto line = get_line_entry_from_pc(func_entry);
    auto start_line = get_line_entry_from_pc(get_offset_pc());

    std::vector<std::intptr_t> to_delete{};

    while (line->address < func_end) {
        auto load_address = offset_dwarf_address(line->address);
        if (line->address != start_line->address && !m_breakpoints.count(load_address)) {
            set_breakpoint_at_address(load_address);
            to_delete.push_back(load_address);
        }
        ++line;
    }
```

We'll need to remove any breakpoints we set so that they don't leak out of our step function, so we keep track of them in a `std::vector`. To set all the breakpoints, we loop over the line table entries until we hit one which is outside the range of our function. For each one, we make sure that it's not the line we are currently on, and that there's not already a breakpoint set at that location. We also need to offset the addresses we get from the DWARF information by the load address to set breakpoints.

```cpp
    auto frame_pointer = get_register_value(m_pid, reg::rbp);
    auto return_address = read_memory(frame_pointer+8);
    if (!m_breakpoints.count(return_address)) {
        set_breakpoint_at_address(return_address);
        to_delete.push_back(return_address);
    }
```

Here we are setting a breakpoint on the return address of the function, just like in `step_out`.

```cpp
    continue_execution();

    for (auto addr : to_delete) {
        remove_breakpoint(addr);
    }
}
```

Finally, we continue until one of those breakpoints has been hit, then remove all the temporary breakpoints we set.

It ain't pretty, but it'll do for now. Here's the whole function:

```cpp
void debugger::step_over() {
    auto func = get_function_from_pc(get_offset_pc());
    auto func_entry = at_low_pc(func);
    auto func_end = at_high_pc(func);

    auto line = get_line_entry_from_pc(func_entry);
    auto start_line = get_line_entry_from_pc(get_offset_pc());

    std::vector<std::intptr_t> to_delete{};

    while (line->address < func_end) {
        auto load_address = offset_dwarf_address(line->address);
        if (line->address != start_line->address && !m_breakpoints.count(load_address)) {
            set_breakpoint_at_address(load_address);
            to_delete.push_back(load_address);
        }
        ++line;
    }

    auto frame_pointer = get_register_value(m_pid, reg::rbp);
    auto return_address = read_memory(frame_pointer+8);
    if (!m_breakpoints.count(return_address)) {
        set_breakpoint_at_address(return_address);
        to_delete.push_back(return_address);
    }

    continue_execution();

    for (auto addr : to_delete) {
        remove_breakpoint(addr);
    }
}
```

Of course, we also need to add this new functionality to our UI:

```cpp
    else if(is_prefix(command, "step")) {
        step_in();
    }
    else if(is_prefix(command, "next")) {
        step_over();
    }
    else if(is_prefix(command, "finish")) {
        step_out();
    }
```

## Testing

I tested out my implementation with a simple program which calls a bunch of different functions:

```cpp
void a() {
    int foo = 1;
}

void b() {
    int foo = 2;
    a();
}

void c() {
    int foo = 3;
    b();
}

void d() {
    int foo = 4;
    c();
}

void e() {
    int foo = 5;
    d();
}

void f() {
    int foo = 6;
    e();
}

int main() {
    f();
}
```

You should be able to set a breakpoint on the address of `main` and then in, over, and out all over the program. Expect things to break if you try to step out of `main` or into some dynamically linked library.

---

You can find the code for this post [here](https://github.com/TartanLlama/minidbg/tree/tut_dwarf_step). Next time we'll use our newfound DWARF expertise to implement source-level breakpoints.

[Next post](/posts/writing-a-linux-debugger/source-level-breakpoints)
