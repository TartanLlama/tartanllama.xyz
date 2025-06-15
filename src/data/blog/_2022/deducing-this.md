---
author: Sy Brand
pubDatetime: 2022-07-27
title: "C++23's Deducing this"
draft: false
tags:
  - C++
  - C++23
  - Metaprogramming
canonicalURL: https://tartanllama.xyz/posts/deducing-this
description: What it is, why it is, how to use it
---

_Originally published on [Microsoft's C++ blog](https://devblogs.microsoft.com/cppblog/cpp23-deducing-this/)._

## Table of Contents

[Deducing this](https://wg21.link/p0847) (P0847) is a C++23 feature which gives a new way of specifying non-static member functions. Usually when we call an object's member function, the object is implicitly passed to the member function, despite not being present in the parameter list. P0847 allows us to make this parameter _explicit_, giving it a name and `const`/reference qualifiers. For example:

```cpp
struct implicit_style {
    void do_something(); //object is implicit
};

struct explicit_style {
    void do_something(this explicit_style& self); //object is explicit
};
```

The explicit object parameter is distinguished by the keyword `this` placed before the type specifier, and is only valid for the first parameter of the function.

The reasons for allowing this may not seem immediately obvious, but a bunch of additional features fall out of this almost by magic. These include de-quadruplication of code, recursive lambdas, passing `this` by value, and a version of the [CRTP](https://www.fluentcpp.com/2017/05/12/curiously-recurring-template-pattern/) which doesn't require the base class to be templated on the derived class.

This post will walk through an overview of the design, then many of the cases you can use this feature for in your own code.

For the rest of this blog post I'll refer to the feature as "explicit object parameters", as it makes more sense as a feature name than "deducing `this`". A good companion to this post is Ben Deane's talk [Deducing this Patterns](https://www.youtube.com/watch?v=jXf--bazhJw) from CppCon.

## Overview

The paper which proposed this feature was written by [Gašper Ažman](https://twitter.com/atomgalaxy), [Ben Deane](https://twitter.com/ben_deane), [Barry Revzin](https://twitter.com/BarryRevzin), and myself, and was guided by the experience of many [experts in the field](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2021/p0847r7.html#acknowledgements). Barry and I began writing a version of this paper after we each implemented [`std::optional`](https://en.cppreference.com/w/cpp/utility/optional) and came across the same problem. We would be writing the `value` function of `optional` and, like good library developers, we'd try to make it usable and performant in as many use-cases as we could. So we'd want value to return a `const` reference if the object it was called on was `const`, we'd want it to return an rvalue if the object it was called on was an rvalue, etc. It ended up looking like this:

```cpp
template <typename T>
class optional {
  // version of value for non-const lvalues
  constexpr T& value() & {
    if (has_value()) {
      return this->m_value;
    }
    throw bad_optional_access();
  }

  // version of value for const lvalues
  constexpr T const& value() const& {
    if (has_value()) {
      return this->m_value;
    }
    throw bad_optional_access();
  }

  // version of value for non-const rvalues... are you bored yet?
  constexpr T&& value() && {
    if (has_value()) {
      return std::move(this->m_value);
    }
    throw bad_optional_access();
  }

  // you sure are by this point
  constexpr T const&& value() const&& {
    if (has_value()) {
      return std::move(this->m_value);
    }
    throw bad_optional_access();
  }
  // ...
};
```

If you're not familiar with the `member_function_name() &` syntax, this is called "ref-qualifiers" and you can find more info on [Andrzej Krzemieński's blog](https://akrzemi1.wordpress.com/2014/06/02/ref-qualifiers/). If you're not familiar with rvalue references (`T&&`) you can read up on move semantics on [this Stack Overflow question](https://stackoverflow.com/questions/3106110/what-is-move-semantics)

Note the near-identical implementations of four versions of the same function, only differentiated on whether they're `const` and whether they move the stored value instead of copying it.

Barry and I would then move on to some other function and have to do the same thing. And again and again, over and over, duplicating code, making mistakes, building maintenance headaches for the future versions of ourselves. "What if", we thought, "you could just write this?"

```cpp
template <typename T>
struct optional {
  // One version of value which works for everything
  template <class Self>
  constexpr auto&& value(this Self&& self) {
    if (self.has_value()) {
        return std::forward<Self>(self).m_value;
    }
    throw bad_optional_access();
  }
  // ...
};
```

If you're not familiar with std::forward, you can read about perfect forwarding on [Eli Bendersky's blog](https://eli.thegreenplace.net/2014/perfect-forwarding-and-universal-references-in-c).

This does the same thing as the above four overloads, but in a single function. Instead of writing different versions of `value` for `const optional&`, `const optional&&`, `optional&`, and `optional&&`, we write one function template which deduces the `const`/`volatile`/reference (cvref for short) qualifiers of the object the it is called on. Making this change for almost every function in the type would cut down our code by a huge amount.

So we wrote a version of what eventually got standardised, soon discovered that Gašper and Ben were working on a different paper for the exact same feature, we joined forces, and here we all are several years later.

## Design

The key design principle we followed was that it should do what you expect. To achieve this, we touched as few places in the standard as we possibly could. Notably, we didn't touch overload resolution rules or template deduction rules, and name resolution was only changed a little bit (as a treat).

As such, say we have a type like so:

```cpp
struct cat {
    template <class Self>
    void lick_paw(this Self&& self);
};
```

The template parameter `Self` will be deduced based on all of the same template deduction rules you're already familiar with. There's no additional magic. You don't have to use the names `Self` and `self`, but I think they're the clearest options, and this follows what several other programming languages do.

```cpp
cat marshmallow;
marshmallow.lick_paw();                         //Self = cat&

const cat marshmallow_but_stubborn;
marshmallow_but_stubborn.lick_paw();            //Self = const cat&

std::move(marshmallow).lick_paw();              //Self = cat
std::move(marshmallow_but_stubborn).lick_paw(); //Self = const cat
```

One name resolution change is that inside such a member function, you are not allowed to explicitly or implicitly refer to `this`.

```cpp
struct cat {
    std::string name;

    void print_name(this const cat& self) {
        std::cout << name;       //invalid
        std::cout << this->name; //also invalid
        std::cout << self.name;  //all good
    }
};
```

## Use Cases

For the rest of this post, we'll look at all the different uses of this feature (at least the ones discovered so far that I know of!) Many of these examples were taken straight from the paper.

### De-duplication/quadruplication

We've already seen how the feature can be applied to a type such as `optional` to avoid having to write four overloads of the same function.

Note also that this lowers the burden on initial implementation and maintenance of dealing with rvalue member functions. Quite often developers will write only `const` and non-`const` overloads for member functions, since in many cases we don't really want to write another two whole functions just to deal with rvalues. With deduced qualifiers on `this`, we get the rvalue versions for free: we just need to write `std::forward` in the right places to get the runtime performance gains which come with avoiding unnecessary copies:

```cpp
class cat {
    toy held_toy_;

public:
    //Before explicit object parameters
    toy& get_held_toy() { return held_toy_; }
    const toy& get_held_toy() const { return held_toy_; }

    //After
    template <class Self>
    auto&& get_held_toy(this Self&& self) {
        return self.held_toy_;
    }

    //After + forwarding
    template <class Self>
    auto&& get_held_toy(this Self&& self) {
        return std::forward<Self>(self).held_toy_;
    }
};
```

Of course for a simple getter like this, whether or not this change is worth it for your specific use case is up to you. But for more complex functions, or cases where you are dealing with large objects which you want to avoid copying, explicit object parameters make this much easier to handle.

### CRTP

The Curiously Recurring Template Pattern (CRTP) is a form of compile-time polymorphism which allows you to extend types with common pieces of functionality without paying the runtime costs of virtual functions. This is sometimes referred to as mixins (this isn't all the CRTP can be used for, but it is the most common use). For example, we could write a type `add_postfix_increment` which can be mixed in to another type in order to define postfix increment in terms of prefix increment:

```cpp
template <typename Derived>
struct add_postfix_increment {
    Derived operator++(int) {
        auto& self = static_cast<Derived&>(*this);

        Derived tmp(self);
        ++self;
        return tmp;
    }
};

struct some_type : add_postfix_increment<some_type> {
    // Prefix increment, which the postfix one is implemented in terms of
    some_type& operator++();
};
```

Templating a base class on its derived class and `static_cast`ing `this` inside the function can be a bit arcane, and the problem gets worse when you have multiple levels of CRTP. With explicit object parameters, since we didn't change template deduction rules, _the type of the explicit object parameter can be deduced to a derived type_. More concretely:

```cpp
struct base {
    template <class Self>
    void f(this Self&& self);
};

struct derived : base {};

int main() {
    derived my_derived;
    my_derived.f();
}
```

In the call `my_derived.f()`, the type of `Self` inside `f` is `derived&`, not `base&`.

This means that we can define the above CRTP example like so:

```cpp
struct add_postfix_increment {
    template <typename Self>
    auto operator++(this Self&& self, int) {
        auto tmp = self;
        ++self;
        return tmp;
    }
};

struct some_type : add_postfix_increment {
    // Prefix increment, which the postfix one is implemented in terms of
    some_type& operator++();
};
```

Note that now `add_postfix_increment` is not a template. Instead, we've moved the customisation to the postfix `operator++`. This means we don't need to pass some_type as a template argument anywhere: everything "just works".

### Forwarding out of lambdas

Copying captured values out of a closure is simple: we can just pass around the object as usual. Moving captured values out of a closure is also simple: we can just call `std::move` on it. A problem occurs when we need to perfect-forward a captured value based on whether the closure is an lvalue or rvalue.

One use case I stole from [P2445](https://wg21.link/p2445) is for lambdas which can be used in both "retry" and "try or fail" contexts:

```cpp
auto callback = [m=get_message(), &scheduler]() -> bool {
    return scheduler.submit(m);
};
callback(); // retry(callback)
std::move(callback)(); // try-or-fail(rvalue)
```

The question here is: how do we forward `m` based on the value category of the closure? Explicit object parameters give us the answer. Since a lambda generates a class with an `operator()` member function of the given signature, all the machinary I've just explained works for lambdas too.

```cpp
auto closure = [](this auto&& self) {
    //can use self inside the lambda
};
```

This means we can perfect-forward based on the value category of the closure inside the lambda. P2445 gives a `std::forward_like` helper, which forwards some expression based on the value category of another:

```cpp
auto callback = [m=get_message(), &scheduler](this auto &&self) -> bool {
    return scheduler.submit(std::forward_like<decltype(self)>(m));
};
```

Now our original use case works, and the captured object will be copied or moved depending on how we use the closure.

### Recursive lambdas

Since we now have the ability to name the closure object in a lambda's parameter list, this allows us to do recursive lambdas! As above:

```cpp
auto closure = [](this auto&& self) {
    self(); //just call ourself until the stack overflows
};
```

There are more useful uses for this than just overflowing stacks, though. Consider, for example, the ability to do visitation of recursive data structures without having to define additional types or functions? Given the following definition of a binary tree:

```cpp
struct Leaf { };
struct Node;
using Tree = std::variant<Leaf, Node*>;
struct Node {
    Tree left;
    Tree right;
};
```

We can count the number of leaves like so:

```cpp
int num_leaves(Tree const& tree) {
    return std::visit(overload( //see below
        [](Leaf const&) { return 1; },
        [](this auto const& self, Node* n) -> int {
            return std::visit(self, n->left) + std::visit(self, n->right);
        }
    ), tree);
}
```

`overload` here is some facility to create an overload set from multiple lambdas, and is commonly used for `variant` visitation. See [cppreference's `variant` documentation](https://en.cppreference.com/w/cpp/utility/variant/visit), for example.

This counts the number of leaves in the tree through recursion. For each function call in the call graph, if the current is a `Leaf`, it returns `1`. Otherwise, the overloaded closure calls itself through `self` and recurses, adding together the leaf counts for the left and right subtrees.

### Pass `this` by value

Since we can define the qualifiers of the now-explicit object parameter, we can choose to take it by value rather than by reference. For small objects, this can give us better runtime performance. In case you're not familiar with how this affects code generation, here's an example.

Say we have this code, using regular old implicit object parameters:

```cpp
struct just_a_little_guy {
    int how_smol;
    int uwu();
};

int main() {
    just_a_little_guy tiny_tim{42};
    return tiny_tim.uwu();
}
```

MSVC generates the following assembly:

```asm
sub     rsp, 40
lea     rcx, QWORD PTR tiny_tim$[rsp]
mov     DWORD PTR tiny_tim$[rsp], 42
call    int just_a_little_guy::uwu(void)
add     rsp, 40
ret     0
```

I'll walk through this line-by-line.

- `sub rsp, 40` allocates 40 bytes on the stack. This is 4 bytes to hold the `int` member of `tiny_tim`, 32 bytes of [_shadow space_](https://stackoverflow.com/questions/30190132/what-is-the-shadow-space-in-x64-assembly) for `uwu` to use, and 4 bytes of padding.
- The `lea` instruction loads the address of the `tiny_tim` variable into the `rcx` register, which is where `uwu` is expecting the implicit object parameter (due to the calling conventions used).
- The `mov` stores `42` into the `int` member of `tiny_tim`.
- We then call the `uwu` function.
- Finally we de-allocate the space we allocated on the stack before and return.

What happens if we instead specify `uwu` to take its object parameter by value, like this?

```cpp
struct just_a_little_guy {
    int how_smol;
    int uwu(this just_a_little_guy);
};
```

In that case, the following code is generated:

```cpp
mov     ecx, 42
jmp     static int just_a_little_guy::uwu(this just_a_little_guy)
```

We just move `42` into the relevant register and jump (`jmp`) to the `uwu` function. Since we're not passing by reference we don't need to allocate anything on the stack. Since we're not allocating on the stack we don't need to de-allocate at the end of the function. Since we don't need to deallocate at the end of the function we can just jump straight to `uwu` rather than jumping there and then back into this function when it returns, using call.

These are the kinds of optimisations which can prevent "death by a thousand cuts" where you take small performance hits over and over and over, resulting in slower runtimes that are hard to find the root cause of.

### SFINAE-unfriendly callables

This issue is a bit more esoteric, but does actually happen in real code (I know because I got a bug report on my extended implementation of `std::optional` which hit this exact issue in production). Given a member function of `optional` called `transform`, which calls the given function on the stored value only if there is one, the problem looks like this:

```cpp
struct oh_no {
    void non_const();
};

tl::optional<oh_no> o;
o.transform([](auto&& x) { x.non_const(); }); //does not compile
```

The error which MSVC gives for this is:

```
error C2662: ‘void oh_no::non_const(void)': cannot convert ‘this' pointer from ‘const oh_no' to ‘oh_no &'
```

So it's trying to pass a `const oh_no` as the implicit object parameter to `non_const`, which doesn't work. But where did that `const oh_no` come from? The answer is inside the implementation of `optional` itself. Here is a deliberately stripped-down version:

```cpp
template <class T>
struct optional {
    T t;

    template <class F>
    auto transform(F&& f) -> std::invoke_result_t<F&&, T&>;

    template <class F>
    auto transform(F&& f) const -> std::invoke_result_t<F&&, const T&&>;
};
```

Those `std::invoke_result_t`s are there to make `transform` [SFINAE-friendly](https://stackoverflow.com/questions/35033306/what-does-it-mean-when-one-says-something-is-sfinae-friendly). This basically means that you can check whether a call to `transform` would compile and, if it wouldn't, do something else instead of just aborting the entire compilation. However, there's a bit of a hole in the language here.

When doing overload resolution on `transform`, the compiler has to work out which of those two overloads is the best match given the types of the arguments. In order to do so, it has to instantiate the declarations of both the `const` and non-`const` overloads. If you pass an invocable to `transform` which is not _itself_ SFINAE-friendly, and isn't valid for a `const`-qualified implicit object (which is the case with my example) then instantiating the declaration of the `const` member function will be a hard compiler error. Oof.

Explicit object parameters allow you to solve this problem because the cvref qualifiers are _deduced_ from the expression you call the member function on: if you never call the function on a `const optional`, then the compiler never has to try and instantiate that declaration. Given `std::copy_cvref_t` from [P1450](https://wg21.link/p1450):

```cpp
template <class T>
struct optional {
    T t;

    template <class Self, class F>
    auto transform(this Self&& self, F&& f)
    -> std::invoke_result_t<F&&, std::copy_cvref_t<Self, T>>;
};
```

This allows the above example to compile while still allowing transform to be SFINAE-friendly.

## Conclusion

I hope this has helped you understand the myriad use cases of explicit object parameters. I wonder if we'll discover more in the future!
