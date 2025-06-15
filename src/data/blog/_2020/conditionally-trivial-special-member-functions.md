---
author: Sy Brand
pubDatetime: 2020-11-20
title: "Conditionally Trivial Special Member Functions"
draft: false
tags:
  - C++
  - C++20
  - Metaprogramming
canonicalURL: https://tartanllama.xyz/posts/conditionally-trivial-special-member-functions
description: Why triviality matters and how you can propagate it
---

_Originally published on [Microsoft's C++ blog](https://devblogs.microsoft.com/cppblog/conditionally-trivial-special-member-functions/)._

The C++ standards committee is currently focusing on adding features to the language which can simplify code. One small example of this in C++20 is [conditionally trivial special member functions](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2019/p0848r3.html). Its benefit isn't immediately obvious unless you've been deep down the rabbit hole of high-performance library authoring, so I've written this post to show you how it can make certain generic types more efficient without requiring huge amounts of template magic.

## The Problem

Types which wrap other types are common in the C++ world: pairs, tuples, optionals, adapters, etc. For some of these your implementation can't use the default special member functions (default constructor, copy/move constructor, copy/move assignment, destructor) because there's some additional work that needs to be done. Take for example this `std::optional`-like type:

```cpp
template <typename T>
struct optional {
   bool has_value_;
   union {
      T value_;
      char empty_; //dummy member
   };
};
```

It has a `bool` member to say whether it is currently storing a value, and a union member which either stores a value or stores a dummy member when the optional is empty.

The default special members won't work here: when the union member has non-trivial constructors and destructors, we need to explicitly handle these in our optional type. Focusing on the copy constructor, here's a potential implementation:

```cpp
   optional(optional const& rhs)
      : has_value_(rhs.has_value_), empty_()
   {
      if (has_value_) {
         new (&value_) T(rhs.value_);
      }
   }
```

We check if the `rhs` has a value, and if it does, we use it to copy-construct our own value.

But there's a performance issue here. Say we make a copy of an `optional<int>`, like this:

```
optional<int> make_copy(optional<int> const& o) {
  return o;
}
```

Since `int`s are [trivially copy constructible](https://en.cppreference.com/w/cpp/language/copy_constructor#Trivial_copy_constructor) (i.e. one can copy them by copying their memory rather than having to use any constructors), copying the `optional<int>` should only require copying its byte representation. But this is the code which the compiler generates for make_copy:

```asm
      movzx eax, BYTE PTR [rdx]   ; load o
      mov BYTE PTR [rcx], al      ; copy.has_value_ = rhs.has_value_
      test al, al                 ; test rhs.has_value_
      je SHORT $EMPTY             ; if it's empty, jump to the end
      mov eax, DWORD PTR [rdx+4]  ; load rhs.value_
      mov DWORD PTR [rcx+4], eax  ; store to copy.value_
$EMPTY:
      mov rax, rcx                ; return copy
      ret 0
```

What we really want is a way to use the default special member if the corresponding one in `T` is trivial, and otherwise use our custom one.

## C++17 Approaches

One approach which at first seems possible is using `std::enable_if` to select between the default and custom copy constructor implementations depending on the properties of `T`:

```cpp
template <class U = T,
          std::enable_if_t<std::is_copy_constructible_v<U> &&
                           std::is_trivially_copy_constructible_v<U>>* = nullptr>
optional(optional const& rhs) = default;

template <class U = T,
          std::enable_if_t<std::is_copy_constructible_v<U> &&
                           !std::is_trivially_copy_constructible_v<U>>* = nullptr>
optional(optional const& rhs)
      : has_value_(rhs.has_value_), empty_()
{
   if (has_value_) {
   new (&value_) T(rhs.value_);
  }
}
```

Unfortunately, special members other than the default constructor cannot be templates, so this doesn't work.

The common solution which does work is to rip the storage and special members of the template into base classes and select which to inherit from by checking the relevant type traits. The implementation of this is fairly hairy, so I've explained it down at the bottom of this post for those who want to see it.

If we make this change, then the assembly for `make_copy` becomes this:

```asm
      mov rax, QWORD PTR [rdx]   ; load o
      mov QWORD PTR [rcx], rax   ; copy memory
      mov rax, rcx               ; return copy
      ret 0
```

Now we have more efficient code generated, but a whole load of tricky C++ which is hard to write, to maintain, and for the compiler to build efficiently. C++20 lets us keep the efficient assembly, and vastly simplifies the C++.

## C++20 Solution

Although our `std::enable_if` solution from above wouldn't work because those functions can't be templates, you can constrain non-template functions using C++20 concepts:

```cpp
optional(optional const&) = default;

optional(optional const& rhs)
requires std::copy_constructible<T> && !std::is_trivially_copy_constructible_v<T>
    : has_value_(rhs.has_value_), empty_()
{
   if (has_value_) {
   new (&value_) T(rhs.value_);
  }
}
```

Now `optional<T>` is trivially copy constructible if and only if `T` is, with minimal template magic. We've got both efficient code generation and C++ which can be understood and maintained a lot easier than before.

## The Hairy C++17 Implementation

As promised, here's how you'd do this in C++17.

We start off by tearing the storage out into its own base class:

```cpp
template <class T>
struct optional_storage_base {
   optional_storage_base() :
     has_value_(false), empty_()
   {}
   bool has_value_;
   union {
      T value_;
      char empty_;
   };
};
```

We then write a base class for the copy constructor for when `T` is trivially copy constructible, and we introduce a default template parameter which we'll specialize later.

```
template <class T, bool = std::is_trivially_copy_constructible_v<T>>
struct optional_copy_base : optional_storage_base<T> {
  //default copy ctor
   optional_copy_base(optional_copy_base const&) = default;

  //have to default other special members
   ~optional_copy_base() = default;
   optional_copy_base() = default;
   optional_copy_base(optional_copy_base&&) = default;
   optional_copy_base& operator=(optional_copy_base const&) = default;
   optional_copy_base& operator=(optional_copy_base &&) = default;
};
```

Then we specialize this template for when `T` is not trivially copy constructible:

```cpp
template <class T>
struct optional_copy_base<T, false> : optional_storage_base<T> {
   optional_copy_base(optional_copy_base const& rhs)
   {
      if (rhs.has_value_) {
         this->has_value_ = true;
         new (&this->value_) T(rhs.value_);
      }
   }

   //have to default other special members
   ~optional_copy_base() = default;
   optional_copy_base() = default;
   optional_copy_base(optional_copy_base&&) = default;
   optional_copy_base& operator=(optional_copy_base const&) = default;
   optional_copy_base& operator=(optional_copy_base &&) = default;
};
```

Then we make `optional` inherit from `optional_copy_base<T>`:

```cpp
template <typename T>
struct optional : optional_copy_base<T> {
   //other members
};
```

Then we do this all over again for the move constructor, destructor, copy assignment, and move assignment operators. This is exactly what [standard library implementors have to go](https://github.com/microsoft/STL/blob/main/stl/inc/optional) through to get the best codegen possible at the expense of implementation and maintenance burden. It's not fun, [trust me](https://github.com/TartanLlama/optional).
