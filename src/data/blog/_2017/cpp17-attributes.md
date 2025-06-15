---
author: Sy Brand
pubDatetime: 2017-07-20
title: "C++17 attributes: maybe_unused, fallthrough and nodiscard"
draft: false
tags:
  - C++
  - C++17
canonicalURL: https://tartanllama.xyz/posts/cpp17-attributes
description: New attributes in C++17 and how they can help you
---

C++17 adds three new attributes for programmers to better express their intent to the compiler and readers of the code: `maybe_unused`, `fallthrough`, and `nodiscard`. This is a quick post to outline what they do and why they are useful.

In case you aren't familiar with the concept, attributes in C++ allow you mark functions, variables, and other entities with compiler-specific or standard properties. The standard attributes prior to C++17 are `noreturn` (function doesn't return), `deprecated` (entity is going to be removed in a later version) and `carries_dependency` (used for optimizing atomic operations). You mark an entity with an attribute like this:

```cpp
[[deprecated]]
void do_thing_the_old_way();

void do_thing_the_new_way();

do_thing_the_old_way(); // Compiler warning: deprecated
do_thing_the_new_way(); // No warning
```

With that out of the way, on to the new attributes!

## `maybe_unused`

`[[maybe_unused]]` suppresses compiler warnings about unused entities. Usually unused functions or variables indicates a programmer error -- if you never use it, why is it there? -- but sometimes they can be intentional, such as variables which are only used in release mode, or functions only called when logging is enabled.

### Variables

```cpp
void emits_warning(bool b) {
     bool result = get_result();
     // Warning emitted in release mode
     assert (b == result);
     //...
}

void warning_suppressed(bool b [[maybe_unused]]) {
     [[maybe_unused]] bool result = get_result();
     // Warning suppressed by [[maybe_unused]]
     assert (b == result);
     //...
}
```

### Functions

```cpp
static void log_with_warning(){}
[[maybe_unused]] static void log_without_warning() {}

#ifdef LOGGING_ENABLED
log_with_warning();    // Warning emitted if LOGGING_ENABLED is not defined
log_without_warning(); // Warning suppressed by [[maybe_unused]]
#endif
```

I feel like this attribute is more useful to supress compiler warnings than to document your code for others, but at least we now have a standard way to do so.

## `fallthrough`

`[[fallthrough]]` indicates that a fallthrough in a switch statement is intentional. Missing a `break` or `return` in a switch case is a very common programmer error, so compilers usually warn about it, but sometimes a fallthrough can result in some very terse code.

Say we want to process an alert message. If it's green, we do nothing; if it's yellow, we record the alert; if it's orange we record _and_ trigger the alarm; if it's red, we record, trigger the alarm and evacuate.

```cpp
void process_alert (Alert alert) {
     switch (alert) {
     case Alert::Red:
         evacuate();
         // Warning: this statement may fall through

     case Alert::Orange:
         trigger_alarm();
         [[fallthrough]]; //yes, you do need the semicolon
         // Warning suppressed by [[fallthrough]]

     case Alert::Yellow:
         record_alert();
         return;

     case Alert::Green:
         return;
     }
}
```

The most important function of `fallthrough` is as documentation for maintainers. The presence of it in the code above shows anyone looking at the code that an orange alert is absolutely supposed to be recorded. Without the `fallthrough` in the `Alert::Red` case, it is not obvious whether a red alert is supposed to trigger the alarm and be recorded, or just evacuate everyone.

## `nodiscard`

Functions declared with `[[nodiscard]]` should not have their return values ignored by the caller. This can be useful if you want to ensure that callers check a return value, or that some scope guard object has a reasonable lifetime. Types can be marked `[[nodiscard]]` to implicitly mark all functions returning that type as the same.

### Functions

```cpp
[[nodiscard]] error do_something (thing&);
error do_something_else (thing&);

do_something(my_thing); // Warning: ignored return value
do_something_else(my_thing);
```

### Classes

```cpp
[[nodiscard]]
struct lock_guard;

lock_guard lock (mutex& m);

{
    lock(my_mutex); // Warning: ignored return value
    // critical section
}
```

Those warnings will help the user notice that `do_something_else` might be given a bad object, or the critical section won't be locked.

---

Compilers have shipped non-standard extensions to express these concepts for years, but it's great that we now have standard methods to do the same. Leave a comment if you have ideas for other attributes you would like to be added to the language!

For some more examples of using these attributes, see posts by [Kenneth Benzie](https://infektor.net/posts/2017-01-19-using-cpp17-attributes-today.html), [Bartłomiej Filipek](http://www.bfilipek.com/2017/07/cpp17-in-details-attributes.html), and [Arne Mertz](https://arne-mertz.de/2016/12/modern-c-features-attributes/).
