---
author: Sy Brand
pubDatetime: 2016-10-18
title: "Declaring Classes in Function Declarations"
draft: false
tags:
  - C++
canonicalURL: https://tartanllama.xyz/posts/declare-class-in-func
description: You can do this, but don't
---

C++ allows you to declare classes in function declarations. The following code is fully standards-compliant:

```cpp
void foo (class A*){}

A* g_a;

int main() {
    A* a;
    foo(a);
}
```

I thought this was pretty odd and interesting, so went searching for the applicable rules from the standard. Here is the breakdown on how this works.

---

`class A` or `struct A` is called an _elaborated-type-specifier_.

> [[basic.lookup.elab]/2](https://timsong-cpp.github.io/cppwp/n4140/basic.lookup.elab#2):
>
> [...] If the _elaborated-type-specifier_ is introduced by the _class-key_ and this lookup does not find a previously declared _type-name_, or if the _elaborated-type-specifier_ appears in a declaration with the form:
>
> _class-key attribute-specifier-seqopt identifier ;_
>
> the _elaborated-type-specifier_ is a declaration that introduces the _class-name_ as described in 3.3.2.

> [[basic.scope.pdecl]/7](https://timsong-cpp.github.io/cppwp/n4140/basic.scope.pdecl#7)
>
> The point of declaration of a class first declared in an elaborated-type-specifier is as follows:
>
> - [...]
> - for an elaborated-type-specifier of the form
>
> _class-key identifier_
>
> if the elaborated-type-specifier is used in the decl-specifier-seq or parameter-declaration-clause of a function defined in namespace scope, the identifier is declared as a class-name in the namespace that contains the declaration; otherwise, except as a friend declaration, the identifier is declared in the smallest namespace or block scope that contains the declaration.

---

**Don't do this.**
