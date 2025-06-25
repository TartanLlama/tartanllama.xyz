---
author: Sy Brand
pubDatetime: 2025-06-25
title: "WebAssembly Components: Circular Dependencies and World Elaboration"
draft: true
tags:
  - WebAssembly
canonicalURL: https://tartanllama.xyz/posts/wasm-circular-dependencies
description: Why circular dependencies between imports and exports don't work, but seem valid
---

[WebAssembly components](https://component-model.bytecodealliance.org/) are bundles of code and data that run in a sandboxed environment with well-defined interfaces at the source and binary level. There's a subtle gotcha that you may encounter when defining them: when you have circular dependencies between components, you can end up with duplicated types that can't be used interchangeably. In this post we'll walk through the details of this potentially unexpected behaviour, why it occurs, and a few alternative designs that you can consider.

For a short introduction to WebAssembly and the component model, see my post on [writing plugin systems with WebAssembly](/posts/wasm-plugins#webassembly).

## A Motivating Example

Consider the following [WIT](https://component-model.bytecodealliance.org/design/wit.html) definition:

```wit
package cat:registry;

interface host-api {
    resource cat {
        get-name: func() -> string;
    }
}

interface user-api {
    use host-api.{cat};
    notify-cat-registered: func(cat: borrow<cat>);
}

world registry {
    import user-api;
    export host-api;
}

world user {
    export user-api;
}
```

We have an interface called `cat:registry/host-api` that defines a [resource](https://component-model.bytecodealliance.org/design/wit.html#resources) called `cat`. This is an opaque type&mdash;we don't know how it's implemented, only that it exposes a function to get its name. We then have an interface called `cat:registry/user-api` that relies on the `cat` definition from `host-api`. It declares a function to notify it that a `cat` has been registered, which takes a borrowed handle to a `cat`: a temporary loan of the resource. Our `registry` world _imports_ (has a dependency on) the user API so it can call `notify-cat-registered`, and _exports_ (implements) `host-api`. Finally, we have a `user` world, which implements `user-api`.

If you run [`wit-bindgen`](https://github.com/bytecodealliance/wit-bindgen) to generate bindings for the `registry` world, you'll get code that contains roughly these definitions:

```rust
pub mod cat {
    pub mod registry {
        pub mod host_api {
            pub struct Cat {
                handle: _rt::Resource<Cat>,
            }
        }
        pub mod user_api {
            pub fn notify_cat_registered(cat: &super::host_api::Cat) -> () {
                // ...
            }
        }
    }
}

pub mod exports {
    pub mod cat {
        pub mod registry {
            pub struct Cat {
                handle: _rt::Resource<Cat>,
            }
        }
    }
}
```

Even if you don't read much Rust, hopefully you can see that this defines two _separate_ types called `Cat`: one in the `cat::registry::host_api` module and one in the `exports::cat::registry` module. The `notify_cat_registered` function uses the one in the `cat::registry::host_api` module. Since the two `Cat` types are separate, we can't pass a handle for one `Cat` type to a function that expects the other type. Why is there not just one type?

## World Elaboration

The problem becomes clearer if we ask [`wasm-tools`](https://github.com/bytecodealliance/wasm-tools) to dump out the _elaborated world_ for `registry`. This is the world produced by ensuring that a world's implicit dependencies are explicity imported. Let's consider a simpler example:

```wit
package example:elaboration;

interface defines-resource {
    resource the-resource;
}

interface uses-resource {
    use defines-resource.{the-resource};
    consume-resource: func(arg: the-resource);
}

world elaboration {
    export uses-resource;
}
```

We have an interface that defines a resource and an interface that uses that resource. Our `elaboration` world exports the `uses-resource` interface. Assuming this file is called `elaboration.wit`, we can generate the elaborated world like so:

```bash
$ wasm-tools component wit elaboration.wit
```

This prints:

```wit
package example:elaboration;

interface defines-resource {
  resource the-resource;
}

interface uses-resource {
  use defines-resource.{the-resource};
  consume-resource: func(arg: the-resource) -> the-resource;
}

world elaboration {
  import defines-resource; // NEW

  export uses-resource;
}
```

The difference is that the `elaboration` world now has an `import` for `defines-resource`. This is added because the interface that `elaboration` exports depends on a resource defined in `defines-resource`, and thus that interface must be imported by `elaboration`.

This elaboration is _transitive_, so imports will also be added to a world for any dependencies that those dependencies have, any of their dependencies, and so on. For example:

```wit
package example:elaboration;

interface dependency {
    resource dependency-resource;
}

interface defines-resource {
    use dependency.{dependency-resource};
    resource the-resource {
        get-dependency: func() -> dependency-resource;
    }
}

interface uses-resource {
    use defines-resource.{the-resource};
    consume-resource: func(arg: the-resource) -> the-resource;
}

world elaboration {
    export uses-resource;
}
```

In this example, I've added a `dependency` interface with a `dependency-resource` resource. This is then used by our original `defines-resource` interface. The elaborated world for `elaboration` then imports _both_ of these interfaces:

```wit
world elaboration {
  import dependency;
  import defines-resource;

  export uses-resource;
}
```

## The Problem

With that understood, we can look at the elaborated world for `cat:registry/registry` and immediately see the problem. The original world is:

```wit
world registry {
  import user-api;

  export host-api;
  export wasi:cli/run@0.2.6;
}
```

The elaborated world is:

```wit
world registry {
  import host-api; // Uh oh
  import user-api;

  export host-api;
  export wasi:cli/run@0.2.6;
}
```

Now we can see why there were two versions of `Cat`: the `host-api` interface is both exported _and_ imported.

The reason this happens is a bit subtle. Before its exports are made available, a component must be _instantiated_. The first step of this process is to resolve the imports of the component. This means that imports must be supplied _before_ the component's exports are made available; a component's import can't reference one of its exports, because the export wouldn't exist yet.

This leaves us with two questions: why is this elaborated world valid, and what can we do instead?

## Importing and Exporting the Same Interface

It's completely valid to import and export the same interface, and there are situations where this might be exactly what we want. For example, we might be creating a bridge component between two existing components, where we take some type or resource from one and manipulate it before passing it on to the other. For example, we might have a `cat-shelter` component that returns cats. You can ask those cats to do tricks, but they'll always fail. We could introduce a `trainer` component that gets cats from the shelter and teaches them to do tricks so that they always succeed:

```wit
package cat:example;

interface cat-source {
    resource cat {
        do-trick: func() -> result;
    }
    get-cat: func(name: string) -> cat;
}

world shelter {
    export cat-source;
}

world trainer {
    import cat-source;
    export cat-source;
}

world pet-owner {
    import cat-source;
    export wasi:cli/run@0.2.6;
}
```

The `trainer` world both imports and exports `cat-source`. It will take `cat`s from the shelter for which `do-trick` always fails. It'll wrap them up into their own separate `cat` implementation for which `do-trick` always succeeds. You can see a working example of this [on GitHub](https://github.com/TartanLlama/wasm-component-import-export).

You might think that we could support explicit import and exports of the same interface, but error out on the kinds of world elaboration from the `registry` example. However, you could imagine a system where `registry` is backed by some other component that exports the `host-api`. Perhaps we have local registries per-city that are backed by a global registry. Erroring out on this pattern would artificially limit the systems that WIT can model. Perhaps in the future we'll see [WIT linting tools](https://github.com/bytecodealliance/wit-bindgen/issues/1314) that can warn on patterns like this without erroring out your build.

## Alternative Designs

The solution in this particular case is to re-think the design of the components in order to break the circular dependency. Here are a few concrete approaches.

### Pass a Record

Instead of passing a `borrow<cat>` to `notify-cat-registered`, pass a `record` containing the data that the user needs:

```wit
interface user-api {
    record cat-info {
        name: string,
        // other relevant data
    }
    notify-cat-registered: func(info: cat-info);
}
```

### Pass an Integer Identifier

Pass an integer identifier to `notify-cat-registered` and make `registry` expose functions to query relevant `cat` data:

```wit
interface user-api {
    notify-cat-registered: func(cat-id: u32);
}

interface host-api {
    get-cat-name-by-id: func(id: u32) -> option<string>;
}
```

### Intermediary Component

Create a component that sits in the middle, which takes ownership of `cat`s produced by the registry and passes borrows to users:

```wit
interface producer-api {
    resource cat {
        get-name: func() -> string;
    }
    get-new-cats: func() -> list<cat>;
}

interface user-api {
    use producer-api.{cat};
    notify-cat-registered: func(cat: borrow<cat>);
}

world registry {
    import producer-api;
    import user-api;
}

world producer {
    export producer-api;
}

world user {
    export user-api;
}
```

In this example, `registry` acts as an intermediary that polls `producer` to retrieve the list of new cats via `get-new-cats`, then notifies users by calling `notify-cat-registered` with borrowed handles. By putting a component in the middle, we've broken the circular dependency.

## Conclusion

Circular dependencies between WebAssembly components have subtle details to them that are not immediately obvious. While WIT allows importing and exporting the same interface (for which there are valid use cases), unintentional circular dependencies can indicate a design that should be refactored.

Understanding world elaboration and component instantiation helps clarify why certain designs are problematic and what other approaches you can take to solve your problems.

## Acknowledgements

Thanks to Alex Crichton for patiently explaining this all to me as I've been fumbling around with WIT.
