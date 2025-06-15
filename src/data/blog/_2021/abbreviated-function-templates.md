---
author: Sy Brand
pubDatetime: 2021-02-04
title: "Abbreviated Function Templates and Constrained Auto"
draft: false
tags:
  - C++
  - C++20
  - Metaprogramming
canonicalURL: https://tartanllama.xyz/posts/abbreviated-function-templates
description: C++20 features for more terse template code
---

_Originally published on [Microsoft's C++ blog](https://devblogs.microsoft.com/cppblog/abbreviated-function-templates-and-constrained-auto/)._

Declaring function templates in C++ has always been quite verbose. C++20 added a new way of doing so that is more terse and more consistent with lambdas: abbreviated function templates. This short post will show how to use this syntax and how it applies to C++20 concepts.

## Abbreviated Function Templates

C++11 introduced lambdas, which look like this:

```cpp
[captures] (type_1 param_1, type_2 param_2) { body(param_1, param_2); }
```

You can only call this lambdas with arguments of `type_1` and `type_2`. However we frequently use lambdas in situations where the types would be difficult to spell out in full (especially when using features like [ranges](https://en.cppreference.com/w/cpp/ranges)). C++14 allowed you to make lambdas which can be called with arguments of any type by using the `auto` keyword:

```cpp
[captures] (auto param_1, auto param_2) { body(param_1, param_2); }
```

Now you can pass any types as the arguments. C++20's abbreviated function templates allows you to apply this kind of syntax to function templates.

In C++17 you might write a function to give animals head scratches as a function template, so it can be called with any type of animal:

```cpp
template <class Animal>
void give_head_scratches (Animal const& the_animal);
```

In C++20 you can simplify this using `auto`:

```cpp
void give_head_scratches (auto const& the_animal);
```

This version is less verbose, requires coming up with fewer names, and is more consistent with C++14 lambdas.

## Constrained Auto

There's a problem with the above function template though: according to the declaration we can pass literally anything to it. We can happily make calls that look like this:

```cpp
give_head_scratches(42);
give_head_scratches(a_cactus);
give_head_scratches(blog_post);
give_head_scratches(the_platonic_ideal_of_a_chair);
```

They might compile and do something weird, or they might fail to compile due to the implementation of the template doing something which those types don't support. Ideally we'd want to both document the interface of this function template with what kind of types it supports and also give the compiler the ability to give detailed errors when the declaration is instantiated with in incompatible type.

C++20 gives us [Concepts](https://cppreference.com/w/cpp/language/constraints.html) to help solve this problem. If we have some `animal` concept which defines what interface a type representing an animal should have then we can use it like so:

```cpp
template <animal Animal>
void give_head_scratches (Animal const& the_animal);
```

This is quite verbose and repetitive. Ideally we'd be able to use the concept name directly in the function parameter list like this:

```cpp
void give_head_scratches (animal const& the_animal);
```

However, this syntax was rejected from standardization, because you can't tell whether this is a function template or a regular function without knowing whether `animal` is a type or a concept.

Fortunately, a version of this syntax was included in C++20 which uses the `auto` keyword again:

```cpp
void give_head_scratches (animal auto const& the_animal);
```

This checks that whatever is substituted for auto satisfies the `animal` concept. So if we instantiate the template with a `kitten` then `animal<kitten>` will be checked. This gives us back our terse syntax while also allowing us to constrain our template declarations.
