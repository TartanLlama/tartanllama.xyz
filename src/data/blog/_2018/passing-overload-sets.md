---
author: Sy Brand
pubDatetime: 2018-01-18
title: "Passing Overload Sets to Functions"
draft: false
tags:
  - C++
canonicalURL: https://tartanllama.xyz/posts/passing-overload-sets
description: The nightmare of higher-order functions plus overloading
---

Passing functions to functions is becoming increasingly prevalent in C++. With common advice being to prefer algorithms to loops, new library features like `std::visit`, lambdas being incrementally beefed up[^1][^2] and C++ function programming talks consistently being given at conferences, it's something that almost all C++ programmers will need to do at some point. Unfortunately, passing overload sets or function templates to functions is not very well supported by the language. In this post I'll discuss a few solutions and show how C++ still has a way to go in supporting this well.

## An Example

We have some generic operation called `foo`. We want a way of specifying this function which fulfils two key usability requirements.

1- It should be callable directly without requiring manually specifying template arguments:

```cpp
auto a = foo(42);           //good
auto b = foo("hello");      //good
auto c = foo<double>(42.0); //bad
auto d = foo{}(42.0);       //bad
```

2- Passing it to a higher-order function should not require manually specifying template arguments:

```cpp
std::transform(first, last, target, foo);      //good
std::transform(first, last, target, foo<int>); //bad
std::transform(first, last, target, foo{});    //okay I guess
```

A simple first choice would be to make it a function template:

```cpp
template <class T>
T foo(T t) { /*...*/ }
```

This fulfils the first requirement, but not the second:

```cpp
//compiles, but not what we want
std::transform(first, last, target, foo<int>);

//uh oh
std::transform(first, last, target, foo);

7 : <source>:7:5: error: no matching function for call to 'transform'
    std::transform(first, last, target, foo);
    ^~~~~~~~~~~~~~
/opt/compiler-explorer/gcc-7.2.0/lib/gcc/x86_64-linux-gnu/7.2.0/../../../../include/c++/7.2.0/bits/stl_algo.h:4295:5: note: candidate template ignored: couldn't infer template argument '_UnaryOperation'
    transform(_InputIterator __first, _InputIterator __last,
    ^
/opt/compiler-explorer/gcc-7.2.0/lib/gcc/x86_64-linux-gnu/7.2.0/../../../../include/c++/7.2.0/bits/stl_algo.h:4332:5: note: candidate function template not viable: requires 5 arguments, but 4 were provided
    transform(_InputIterator1 __first1, _InputIterator1 __last1,
    ^
1 error generated.
```

That's no good.

A second option is to write `foo` as a function object with a call operator template:

```cpp
struct foo {
    template<class T>
    T operator()(T t) { /*...*/ }
};
```

We are now required to create an instance of this type whenever we want to use the function, which is okay for passing to other functions, but not great if we want to call it directly:

```cpp
//this looks okay
std::transform(first, last, target, foo{});

//this looks strange
auto x = foo{}(42.0);
auto x = foo()(42.0);
```

We have similar problems when we have multiple overloads, even when we're not using templates:

```cpp
int foo (int);
float foo (float);

std::transform(first, last, target, foo); //doesn't compile
// ew ew ew ew ew ew ew
std::transform(first, last, target, static_cast<int(*)(int)>(foo));
```

We're going to need a different solution.

## Lambdas and `LIFT`

As an intermediate step, we could use the normal function template approach, but wrap it in a lambda whenever we want to pass it to another function:

```cpp
std::transform(first, last, target,
               [](const auto&... xs) { return foo(xs...); });
```

That's not great. It'll work in some contexts where we don't know what template arguments to supply, but it's not yet suitable for all cases. One improvement would be to add perfect forwarding:

```cpp
[](auto&&... xs) { return foo(std::forward<decltype(xs)>(xs)...); }
```

But wait, we want to be SFINAE friendly, so we'll add a trailing return type:

```cpp
[](auto&&... xs) -> decltype(foo(std::forward<decltype(xs)>(xs)...)) {
    return foo(std::forward<decltype(xs)>(xs)...);
}
```

Okay, it's getting pretty crazy and expert-only at this point. And we're not even done! Some contexts will care about `noexcept`:

```cpp
[](auto&&... xs)
    noexcept(noexcept(foo(std::forward<decltype(xs)>(xs)...)))
          -> decltype(foo(std::forward<decltype(xs)>(xs)...)) {
    return foo(std::forward<decltype(xs)>(xs)...);
}
```

So the solution is to write this every time we want to pass an overloaded function to another function. That's probably a good way to make your code reviewer cry.

What would be nice is if [P0573: Abbreviated Lambdas for Fun and Profit](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/p0573r2.html) and [P0644: Forward without `forward`](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/p0644r0.html) were accepted into the language. That'd let us write this:

```cpp
[](xs...) => foo(>>xs...)
```

The above is functionally equivalent to the triplicated monstrosity in the example before. Even better, if [P0834: Lifting overload sets into objects](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/p0834r0.html) was accepted, we could write:

```cpp
[]foo
```

That lifts the overload set into a single function object which we can pass around. Unfortunately, all of those proposals have been rejected. Maybe they can be renewed at some point, but for now we need to make do with other solutions. One such solution is to approximating `[]foo` with a macro (I know, I know).

```cpp
#define FWD(...) std::forward<decltype(__VA_ARGS__)>(__VA_ARGS__)

#define LIFT(X) [](auto &&... args) \
    noexcept(noexcept(X(FWD(args)...)))  \
    -> decltype(X(FWD(args)...)) \
{  \
    return X(FWD(args)...); \
}
```

Now our higher-order function call becomes:

```cpp
std::transform(first, last, target, LIFT(foo));
```

Okay, so there's a macro in there, but it's not _too_ bad (you know we're in trouble when I start trying to justify the use of macros for this kind of thing). So `LIFT` is at least some solution.

## Making Function Objects Work for Us

You might recall from a number of examples ago that the problem with using function object types was the need to construct an instance whenever we needed to call the function. What if we make a global instance of the function object?

```cpp
struct foo_impl {
    //template
    template<class T>
    T operator()(T t) { /*...*/ }

   //overloads
   int operator()(int) { /*...*/ }
   float operator()(float) { /*...*/ }
};

extern const foo_impl foo;

// in some .cpp file
foo_impl foo;
```

This works if you're able to have a single translation unit with the definition of the global object. If you're writing a header-only library then you don't have that luxury, so you need to do something different.

```cpp
struct foo_impl {
    template<class T>
    T operator()(T t) { /*...*/ }
};

static constexpr foo_impl foo;
```

This might look innocent, but it can lead to One-Definition Rule (ODR) violations[^3]:

```cpp
//test.h header
struct foo_impl {
    template<class T>
    T operator()(T t) const { return t; }
};

static constexpr foo_impl foo;

template <class T>
int oh_no(T t) {
    auto* foop = &foo;
    return (*foop)(t);
}

//cpp1
#include "test.h"
int sad() {
    return oh_no(42);
}

//cpp2
#include "test.h"
int also_sad() {
    return oh_no(24);
}
```

Since `foo` is declared `static`, each Translation Unit (TU) will get its own definition of the variable. However, `sad` and `also_sad` will instantiate `oh_no` which will get different definitions of `foo` for `&foo`. This is undefined behaviour by [`[basic.def.odr]/12.2`](http://eel.is/c++draft/basic.def.odr#12.2).

In C++17 the solution is simple:

```cpp
inline constexpr foo_impl foo{};
```

The `inline` allows the variable to be multiply-defined, and the linker will throw away all but one of the definitions.

If you can't use C++17, there are a few solutions given in [N4424: Inline Variables](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2015/n4424.pdf). The [Ranges V3 library](https://github.com/ericniebler/range-v3/blob/8ccd974b5cbb91dc9de7ab969abd568fcf569019/include/range/v3/detail/config.hpp#L412) uses a reference to a static member of a template class:

```cpp
template<class T>
struct static_const {
    static constexpr T value{};
};

template <class T>
constexpr T static_const<T>::value;

constexpr auto& foo = static_const<foo_impl>::value;
```

An advantage of the function object approach is that function objects designed carefully make for much better customisation points than the traditional techniques used in the standard library. See Eric Niebler's [blog post](http://ericniebler.com/2014/10/21/customization-point-design-in-c11-and-beyond/) and [standards paper](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2015/n4381.html) for more information.

A disadvantage is that now we need to write all of the functions we want to use this way as function objects, which is not great at the best of times, and even worse if we want to use external libraries. One possible solution would be to combine the two techniques we've already seen:

```cpp
// This could be in an external library
namespace lib {
    template <class T>
    T foo(T t) { /*...*/ }
}

namespace lift {
    inline constexpr auto foo = LIFT(lib::foo);
}
```

Now we can use `lift::foo` instead of `lib::foo` and it'll fit the requirements I laid out at the start of the post. Unfortunately, I think it's possible to hit ODR-violations with this due to possible difference in closure types cross-TU. I'm not sure what the best workaround for this is, so input is appreciated.

## Conclusion

I've given you a few solutions to the problem I showed at the start, so what's my conclusion? C++ still has a way to go to support this paradigm of programming, and teaching these ideas is a nightmare. If a beginner or even intermediate programmer asks how to pass overloaded functions around -- something which sounds like it should be fairly easy -- it's a real shame that the best answers I can come up with are "Copy this macro which you have no chance of understanding", or "Make function objects, but make sure you do it this way for reasons which I can't explain unless you understand the subtleties of ODR[^4]". I feel like the language could be doing more to support these use cases.

Maybe for some people "Do it this way and don't ask why" is an okay answer, but that's not very satisfactory to me. Maybe I lack imagination and there's a better way to do this with what's already available in the language.

---

[^1]: [P0315: Lambdas in unevaluated contexts](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/p0315r2.pdf)

[^2]: [P0624: Default constructible and assignable stateless lambdas](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/p0624r2.pdf)

[^3]: Example lovingly stolen from [n4381](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2015/n4381.html).

[^4]: Disclaimer: I don't understand all the subtleties of ODR.

Thanks to Michael Maier for the motivation to write this post; Jayesh Badwaik, Ben Craig, Michał Dominiak and Kévin Boissonneault for discussion on ODR violations; and Eric Niebler, Barry Revzin, Louis Dionne, and Michał Dominiak (again) for their work on the libraries and standards papers I referenced.

---
