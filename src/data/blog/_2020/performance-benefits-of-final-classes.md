---
author: Sy Brand
pubDatetime: 2020-03-02
title: "The Performance Benefits of Final Classes"
draft: false
tags:
  - C++
canonicalURL: https://tartanllama.xyz/posts/performance-benefits-of-final-classes
description: How the final keyword aids devirtualization and makes your code faster
---

_Originally published on [Microsoft's C++ blog](https://devblogs.microsoft.com/cppblog/cpp23-deducing-this/)._

The `final` specifier in C++ marks a class or virtual member function as one which cannot be derived from or overriden. For example, consider the following code:

```cpp
struct base {
  virtual void f() const = 0;
};

struct derived final : base {
  void f() const override {}
};
```

If we attempt to write a new class which derives from `derived` then we get a compiler error:

```cpp
struct oh_no : derived {
};
```

```
<source>(9): error C3246: 'oh_no': cannot inherit from 'derived' as it has been declared as 'final'
<source>(5): note: see declaration of 'derived'
```

The `final` specifier is useful for expressing to readers of the code that a class is not to be derived from and having the compiler enforce this, but it can also improve performance through aiding _devirtualization_.

## Devirtualization

Virtual functions require an indirect call through the vtable, which is more expensive than a direct call due to interactions with branch prediction and the instruction cache, and also the prevention of further optimizations which could be carried out after inlining the call.

Devirtualization is a compiler optimization which attempts to resolve virtual function calls at compile time rather than runtime. This eliminates all the issues noted above, so it can greatly improve the performance of code which uses many virtual calls.

Here is a minimal example of devirtualization:

```cpp
struct dog {
  virtual void speak() {
    std::cout << "woof";
  }
};

int main() {
  dog fido;
  fido.speak();
}
```

In this code, even though dog::speak is a virtual function, the only possible result of main is to output "woof". If you look at the [compiler output](https://godbolt.org/z/_ZJqvN) you'll see that MSVC, GCC, and Clang all recognize this and inline the definition of `dog::speak` into main, avoiding the need for an indirect call.

## The Benefit of `final`

The final specifier can provide the compiler with more opportunities for devirtualization by helping it identify more cases where virtual calls can be resolved at compile time. Coming back to our original example:

```cpp
struct base {
  virtual void f() const = 0;
};

struct derived final : base {
  void f() const override {}
};
```

Consider this function:

```cpp
void call_f(derived const& d) {
  d.f();
}
```

Since derived is marked `final`, the compiler knows it cannot be derived from further. This means that the call to `f` will only ever call `derived::f`, so the call can be resolved at compile time. As proof, here is the compiler output for `call_f` on MSVC when `derived` or `derived::f` are marked as final:

```asm
ret 0
```

You can see that the `derived::f` has been inlined into the definition of `call_f`. If we were to take the `final` specifier off the definition, the assembly would look like this:

```asm
mov rax, QWORD PTR [rcx]
rex_jmp QWORD PTR [rax]
```

This code loads the vtable from `d`, then makes an indirect call to `derived::f` through the function pointer stored at the relevant location.

The cost of a pointer load and jump may not look like much since it's just two instructions, but remember that this may involve a branch misprediction and/or instruction cache miss, which would result in a pipeline stall. Furthermore, if there was more code in `call_f` or functions which call it, the compiler may be able to optimize it much more aggressively given the full visibility of the code which will be executed and the additional analysis which this enables.

## Conclusion

Marking your classes or member functions as final can improve the performance of your code by giving the compiler more opportunities to resolve virtual calls at compile time.

Consider if there are any places in your codebases which would benefit from this and measure the impact!
