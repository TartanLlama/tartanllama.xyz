---
author: Sy Brand
pubDatetime: 2019-10-01
title: "C++20's Conditionally Explicit Constructors"
draft: false
tags:
  - C++
  - C++20
canonicalURL: https://tartanllama.xyz/posts/conditionally-explicit-constructors
description: What this feature is, and how it simplifies code
---

_Originally published on [Microsoft's C++ blog](https://devblogs.microsoft.com/cppblog/c20s-conditionally-explicit-constructors/)_

`explicit(bool)` is a C++20 feature for simplifying the implementation of generic types and improving compile-time performance.

In C++ it is common to write and use types which wrap objects of other types. `std::pair` and `std::optional` are two examples, but there are plenty of others in the standard library, Boost, and likely your own codebases. Following the [principle of least astonishment](https://en.wikipedia.org/wiki/Principle_of_least_astonishment), it pays to ensure that these wrappers preserve the behavior of their stored types as much as is reasonable.

Take `std::string` as an example. It allows implicit conversion from a string literal, but not from a `std::string_view`:

```cpp
void f(std::string);

f("hello");   //compiles
f("hello"sv); //compiler error
```

This is achieved in `std::string` by marking the constructor which takes a `std::string_view` as [explicit](https://en.cppreference.com/w/cpp/language/explicit).

If we are writing a wrapper type, then in many cases we would want to expose the same behaviour, i.e. if the stored type allows implicit conversions, then so does our wrapper; if the stored type does not, then our wrapper follows[^1]. More concretely:

```cpp
void g(wrapper<std::string>);

g("hello");   //this should compile
g("hello"sv); //this should not
```

The common way to implement this is using [SFINAE](https://en.cppreference.com/w/cpp/language/sfinae.html). If we have a wrapper which looks like this[^2]:

```cpp
template<class T>
struct wrapper {
  template <class U>
  wrapper(U const& u) : t_(u) {}

  T t_;
};
```

Then we replace the single constructor with two overloads: one implicit constructor for when `U` is convertible to `T` and one `explicit` overload for when it is not:

```cpp
template<class T>
struct wrapper {
  template<class U, std::enable_if_t<std::is_convertible_v<U, T>>* = nullptr>
  wrapper(U const& u) : t_(u) {}

  template<class U, std::enable_if_t<!std::is_convertible_v<U, T>>* = nullptr>
  explicit wrapper(U const& u) : t_(u) {}

  T t_;
};
```

This gives our type the desired behavior. However, it's not very satisfactory: we now need two overloads for what should really be one and we're using SFINAE to choose between them, which means we take hits on compile-time and code clarity.`explicit(bool)` solves both problems by allowing you to lift the convertibility condition into the `explicit` specifier:

```cpp
template<class T>
struct wrapper {
  template<class U>
  explicit(!std::is_convertible_v<U, T>)
  wrapper(U const& u) : t_(u) {}

  T t_;
};
```

Next time you need to make something conditionally `explicit`, use `explicit(bool)` for simpler code, faster compile times[^3], and less code repetition.

---

[^1]: I know, implicit conversions are evil. There are some places where they make a big improvement to ergonomics though and leaving choices to users makes our generic types more widely applicable.

[^2]: `std::forward` and such omitted for brevity.

[^3]: I tested 500 template instantiations with Visual Studio 2019 version 16.2 and using `explicit(bool)` sped up the frontend by ~15%
