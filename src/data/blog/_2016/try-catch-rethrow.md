---
author: Sy Brand
pubDatetime: 2016-08-09
title: "The Effect of a try-catch-rethrow"
draft: false
tags:
  - C++
canonicalURL: https://tartanllama.xyz/posts/try-catch-rethrow
description: A subtle way in which try-catch-rethrow blocks are not equivalent to standard blocks
---

A try-catch-rethrow with an empty handler does more than a standard block. Here's what I mean:

```cpp
{
    //Some code which may throw
}
```

```cpp
try {
    //Some code which may throw
} catch(...) {
    throw;
}
```

Under some circumstances, these two forms are different. Specifically, the latter necessitates stack unwinding, whereas for the former it is implementation-defined whether or not the stack is unwound. The relevant standards quotes:

> [[except.ctor]/1](https://timsong-cpp.github.io/cppwp/n4140/except.ctor#1):
>
> As control passes from a _throw-expression_ to a handler, destructors are invoked for all automatic objects constructed since the try block was entered. The automatic objects are destroyed in the reverse order of the completion of their construction.

> [[except.ctor]/3](https://timsong-cpp.github.io/cppwp/n4140/except.ctor#3):
>
> The process of calling destructors for automatic objects constructed on the path from a try block to a _throw-expression_ is called "stack unwinding." [...]

The above paragraphs mandate stack unwinding when control passes to the handler (the `catch` block).

> [[except.terminate]/1-2](https://timsong-cpp.github.io/cppwp/n4140/except.terminate#1)
>
> In some situations exception handling must be abandoned for less subtle error handling techniques. [Notes]
>
> In such cases, `std::terminate()` is called (18.8.3). **In the situation where no matching handler is found, it is implementation-defined whether or not the stack is unwound before `std::terminate()` is called**. [...]

As such, if you want to guarantee that your automatic objects have their destructors run in the case of an unhandled exception (e.g. some persistent storage must be mutated on destruction) then `try {/*code*/} catch (...) {throw;}` will do that, but `{/*code*/}` will not.
