---
author: Sy Brand
pubDatetime: 2017-06-24
title: "Writing a Linux Debugger Part 8: Stack Unwinding"
draft: false
tags:
  - Debuggers
  - Writing a Linux Debugger
canonicalURL: https://tartanllama.xyz/posts/writing-a-linux-debugger/stack-unwinding
description: Adding support for backtraces
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

Sometimes the most important information you need to know about what your current program state is how it got there. This is typically provided with a `backtrace` command, which gives you the chain of function calls which have lead to the the program is right now. This post will show you how to implement stack unwinding on x86_64 to generate such a backtrace.

Take the following program as an example:

```cpp
void a() {
    //stopped here
}

void b() {
     a();
}

void c() {
     a();
}

int main() {
    b();
    c();
}
```

If the debugger is stopped at the `//stopped here` line, there are two ways which it could have got there: `main->b->a` or `main->c->a`. If we set a breakpoint there with LLDB, continue, and ask for a backtrace, then we get the following:

```
* frame #0: 0x00000000004004da a.out`a() + 4 at bt.cpp:3
  frame #1: 0x00000000004004e6 a.out`b() + 9 at bt.cpp:6
  frame #2: 0x00000000004004fe a.out`main + 9 at bt.cpp:14
  frame #3: 0x00007ffff7a2e830 libc.so.6`__libc_start_main + 240 at libc-start.c:291
  frame #4: 0x0000000000400409 a.out`_start + 41

```

This says that we are currently in function `a`, which we got to from function `b`, which we got to from `main` and so on. Those final two frames are how the compiler has bootstrapped the `main` function.

The question now is how we implement this on x86_64. The most robust way to do this is to parse the `.eh_frame` section of the ELF file and work out how to unwind the stack from there, but this is a pain. You could use `libunwind` or something similar to do it for you, but that's boring. Instead, we'll assume that the compiler has laid out the stack in a certain way and we'll walk it manually. In order to do this, we first need to understand how the stack is laid out.

```
            High
        |   ...   |
        +---------+
     +24|  Arg 1  |
        +---------+
     +16|  Arg 2  |
        +---------+
     + 8| Return  |
        +---------+
EBP+--> |Saved EBP|
        +---------+
     - 8|  Var 1  |
        +---------+
ESP+--> |  Var 2  |
        +---------+
        |   ...   |
            Low
```

As you can see, the frame pointer for the last stack frame is stored at the start of current stack frame, creating a linked list of frame pointers. The stack is unwound by following this linked list. We can find out which function the next frame in the list belongs to by looking up the return address in the DWARF info. Some compilers will omit tracking the frame base with the `EBP`, since this can be represented as an offset from `ESP` and it frees up an extra register. Passing `-fno-omit-frame-pointer` to GCC or Clang should force it to follow the convention we're relying on, even when optimisations are enabled.

We'll do all our work in a `print_backtrace` function:

```cpp
void debugger::print_backtrace() {
```

Something to decide early is what format to print out the frame information in. I used a little lambda to push this out the way:

```cpp
    auto output_frame = [frame_number = 0] (auto&& func) mutable {
        std::cout << "frame #" << frame_number++ << ": 0x" << dwarf::at_low_pc(func)
                  << ' ' << dwarf::at_name(func) << std::endl;
    };
```

The first frame to print out will be the one which is currently being executed. We can get the information for this frame by looking up the current program counter in the DWARF:

```cpp
    auto current_func = get_function_from_pc(offset_load_address(get_pc()));
    output_frame(current_func);
```

Next we need to get the frame pointer and return address for the current function. The frame pointer is stored in the `rbp` register, and the return address is 8 bytes up the stack from the frame pointer.

```cpp
    auto frame_pointer = get_register_value(m_pid, reg::rbp);
    auto return_address = read_memory(frame_pointer+8);
```

Now we have all the information we need to unwind the stack. I'm going to keep unwinding until the debugger hits `main`, but you could also choose to stop when the frame pointer is `0x0`, which will get you the functions which your implementation called before `main` as well. We'll to grab the frame pointer and return address from each frame and print out the information as we go.

```cpp
    while (dwarf::at_name(current_func) != "main") {
        current_func = get_function_from_pc(offset_load_address(return_address));
        output_frame(current_func);
        frame_pointer = read_memory(frame_pointer);
        return_address = read_memory(frame_pointer+8);
    }
}
```

That's it! The whole function is here for your convenience:

```cpp
void debugger::print_backtrace() {
    auto output_frame = [frame_number = 0] (auto&& func) mutable {
        std::cout << "frame #" << frame_number++ << ": 0x" << dwarf::at_low_pc(func)
                  << ' ' << dwarf::at_name(func) << std::endl;
    };

    auto current_func = get_function_from_pc(get_pc());
    output_frame(current_func);

    auto frame_pointer = get_register_value(m_pid, reg::rbp);
    auto return_address = read_memory(frame_pointer+8);

    while (dwarf::at_name(current_func) != "main") {
        current_func = get_function_from_pc(return_address);
        output_frame(current_func);
        frame_pointer = read_memory(frame_pointer);
        return_address = read_memory(frame_pointer+8);
    }
}
```

## Adding Commands

Of course, we have to expose this command to the user.

```cpp
    else if(is_prefix(command, "backtrace")) {
        print_backtrace();
    }
```

## Testing

A good way to test this functionality is by writing a test program with a bunch of small functions which call each other. Set a few breakpoints, jump around the code a bit, and make sure that your backtrace is accurate.

---

We've come a long way from a program which can merely spawn and attach to other programs. The penultimate post in this series will finish up the implementation of the debugger by supporting the reading and writing of variables. Until then you can find the code for this post [here](https://github.com/TartanLlama/minidbg/tree/tut_unwind).

[Next post](/posts/writing-a-linux-debugger/handling-variables)
