---
author: Sy Brand
pubDatetime: 2017-08-08
title: "void C::C::C::A::A::A::foo(): Valid Syntax Monstrosity"
draft: false
tags:
  - C++
canonicalURL: https://tartanllama.xyz/posts/silly-cpp-syntax
description: Please don't write this code
---

Here's an odd bit of C++ syntax for you. Say we have the following class hierarchy:

```cpp
class A {
public:
    virtual void foo() = 0;
};

class B {
public:
    virtual void foo() = 0;
};

class C : public A, public B {
public:
    virtual void foo();
};
```

The following definitions are all well-formed:

```cpp
void C::foo(){
  std::cout << "C";
}
void C::A::foo(){
  std::cout << "A";
}
void C::B::foo(){
  std::cout << "B";
}
```

The first one defines `C::foo`, the second defines `A::foo` and the third defines `B::foo`. This is valid because of an entity known as the _injected-type-name_:

> [[class]/2](https://timsong-cpp.github.io/cppwp/n4140/class#2):
>
> A _class-name_ is inserted into the scope in which it is declared immediately after the _class-name_ is seen. The _class-name_ is also inserted into the scope of the class itself; this is known as the _injected-class-name_. For purposes of access checking, the _injected-class-name_ is treated as if it were a public member name. [...]

Since `A` is a base class of `C` and the name `A` is injected into the scope of `A`, `A` is also visible from `C`.

The _injected-class-name_ exists to ensure that the class is found during name lookup instead of entities in an enclosing scope. It also makes referring to the class name in a template instantiation easier. But since we're awful people, we can use this perfectly reasonable feature do horribly perverse things like this:

```cpp
void C::C::C::A::A::A::foo(){
    std::cout << "A";
}
```

Yeah, don't do that.
