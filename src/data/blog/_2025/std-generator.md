---
author: Sy Brand
pubDatetime: 2025-02-24
title: "std::generator: Standard Library Coroutine Support"
draft: false
tags:
  - C++
  - C++23
canonicalURL: https://tartanllama.xyz/posts/std-generator
description: Generate sequences of values on-demand with coroutines
---

_Originally published on [Microsoft's C++ blog](https://devblogs.microsoft.com/cppblog/std-generator-standard-library-coroutine-support/)._

## Table of Contents

[`std::generator`](https://en.cppreference.com/w/cpp/coroutine/generator) is a C++23 feature that enables you to write concise, straightforward functions that generate sequences of values on-demand without manually managing state. It builds upon C++20's [coroutines](https://en.cppreference.com/w/cpp/language/coroutines), providing some standard library support for this powerful, but complex, language feature.

This blog post will walk through an example of how to use the feature, compare it to implementing custom ranges, consider some of the design decisions made, and briefly look at the performance implications.

## Motivating Example

Here's a short motivating example from [P2502](https://wg21.link/p2502r2), which proposed the feature:

```cpp
std::generator<int> fibonacci() {
    int a = 0, b = 1;
    while (true) {
        co_yield std::exchange(a, std::exchange(b, a + b));
    }
}

int answer_to_the_universe() {
    auto rng = fibonacci() | std::views::drop(6) | std::views::take(3);
    return std::ranges::fold_left(std::move(rng), 0, std::plus{});
}
```

Here, `fibonacci` is a coroutine, because it uses the `co_yield` keyword. _Coroutines_ are a generalization of a subroutine. A _subroutine_ begins its execution when it is called and completes its execution when it returns to the caller (forgetting about things like exceptions for simplicity). A coroutine's execution similarly begins when it is called, but it need not complete execution to return control flow back to the caller: it can _suspend_ its execution and be resumed later.

Note that, in the above example, `fibonacci` contains an infinite loop. This is not a problem, because when the `co_yield` statement is executed, the coroutine yields both control flow and a value back to the caller, suspending the coroutine's execution. [`std::exchange`](https://en.cppreference.com/w/cpp/utility/exchange) is a small helper utility that assigns a new value to a variable and returns the old one.

The behavior of operations like `co_yield` in a coroutine are determined by the coroutine's return type, in this case `std::generator`.

The `answer_to_the_universe` function uses the `std::generator` object returned by `fibonacci` in tandem with range adaptors. It _pipes_ the generator into two range adaptors. The first says to drop the first 6 elements from the range, while the second says to take the next 3 elements. Note that these range adaptors are not executed eagerly; elements are only dropped or taken when a value is requested from the resulting range.

After building a range to operate on, the `answer_to_the_universe` function sums the values in the range using the [`std::ranges::fold_left`](/posts/fold-algorithms) algorithm. This is a range-based version of [`std::accumulate`](https://en.cppreference.com/w/cpp/algorithm/accumulate). Folding over the values of the range will continually request values from the range, which will generate those values by resuming execution of the coroutine and forwarding on the yielded results. At the end, we end up with the [obvious](https://hitchhikers.fandom.com/wiki/42) answer: `42`.

## Comparison With Custom Ranges

Let's look at how `std::generator` makes it much easier to write code that generates sequences of values that are compatible with the ranges algorithms and views in the standard library.

Say we want to represent an infinite range of random numbers using the [xorshift](https://en.wikipedia.org/wiki/Xorshift) [pseudorandom number generator](https://en.wikipedia.org/wiki/Pseudorandom_number_generator) (PRNG), which looks like this:

```cpp
std::uint64_t xorshift(std::uint64_t state) {
    state ^= state << 13;
    state ^= state >> 7;
    state ^= state << 17;
    return state;
}
```

Given the current state of the PRNG, which is a 64-bit integer, `xorshift(state)` generates the next random number in the sequence. Don't ask me where those numbers come from, they're magic.

Writing a custom range type for this is achievable, but it is quite verbose and requires a somewhat in-depth understanding of ranges. Let's give it a shot.

We'll write a type called `xorshift_range`, which we should be able to use like this:

```cpp
int main() {
    auto is_even = [](auto i) { return i % 2 == 0; };
    auto ten_even_numbers = xorshift_generator(std::random_device{}())
                          | std::views::filter(is_even)
                          | std::views::take(10);
    for (auto i : ten_even_numbers) {
        std::cout << i << ' ';
    }
}
```

The constructor should take a seed for the PRNG, and we should be able to pipe the result into existing range adaptors to, for example, retrieve ten even random numbers.

Let's start with a definition for the type:

```cpp
class xorshift_range {
public:
    explicit xorshift_range(std::uint64_t seed)
        : seed_(seed) {
    }
    class iterator;

    iterator begin() const;
    std::unreachable_sentinel_t end() const {
        return {};
    }
private:
    std::uint64_t seed_;
};
```

Reasonably straightforward for now. The constructor takes a seed and stores it in a member. We declare an iterator type, which will implement the generation logic, and a `begin` function that will return an instance of the iterator type. The iterator will be infinite, so it will always compare not equal to `end()`. As such, end returns a `std::unreachable_sentinel_t`, which compares not equal to everything.

The implementation of the iterator type is more complex, so we'll take it a bit at a time.

```cpp
class xorshift_range::iterator {
public:
    using difference_type = std::ptrdiff_t;
    using value_type = std::uint64_t;
    using iterator_concept = std::forward_iterator_tag;
```

We first provide some member types to indicate some information about our iterator. We won't use `difference_type` in the implementation of the iterator, but it's required for compatibility with ranges, so we pick a reasonable default of `std::ptrdiff_t`. `value_type` is `std::uint64_t` becuause we produce unsigned 64-bit integers. Our iterator cannot move backwards, but you can copy instances of it and increment them independently, which corresponds to [`std::forward_iterator`](https://en.cppreference.com/w/cpp/iterator/forward_iterator), so we set `iterator_concept` to `std::forward_iterator_tag`.

Next come the constructors:

```cpp
    iterator() = default;
    explicit iterator(std::uint64_t seed)
        : state_(seed) {
        ++(*this);
    }
```

C++20 iterators must be default-constructible, so we define a zero-argument constructor. We also define a constructor that takes a seed, stores it in a `state_` member (which we'll define soon), and drives the iterator forward to generate the first random number.

The operator overloads deal with generating the next number and returning it to client code:

```cpp
    std::uint64_t operator*() const {
        return state_;
    }
    iterator& operator++() {
        state_ = xorshift(state_);
        return *this;
    }
    iterator operator++(int) {
        auto copy = *this;
        ++(*this);
        return copy;
    }
```

The dereference operator returns the current number. The pre-increment operator generates the next random number in the sequence using the `xorshift` function we saw earlier. We implement the post-increment operator in terms of the prefix one.

We also need equality operators and the `state_` member:

```cpp
    friend bool operator==(const iterator&, const iterator&) = default;
private:
    std::uint64_t state_ = 0;
};
```

The [default equality operator](https://en.cppreference.com/w/cpp/language/default_comparisons) will check equality based on the current state.

Finally, we need the implementation of begin and one more piece of ranges magic:

```cpp
xorshift_range::iterator xorshift_range::begin() const {
    return iterator{seed_};
}
namespace std::ranges {
    template<>
    constexpr bool enable_borrowed_range<xorshift_range> = true;
}
```

The `begin` function just returns an iterator with the supplied seed. The specialization of `std::ranges::enable_borrowed_range` allows us to use `xorshift_range` as an [rvalue](https://en.cppreference.com/w/cpp/language/value_category) in some contexts, because the iterators can safely outlive the parent `xorshift_range` object without any dangling references.

Phew, that was a lot of work. Want to see the `std::generator` version?

```cpp
std::generator<std::uint64_t> xorshift_generator(std::uint64_t seed) {
    while (true) {
        seed = xorshift(seed);
        co_yield seed;
    }
}
```

That's it. That's the entire code.

It's not entirely the same as the range version, but is clearly a lot easier to implement and maintain. Here are a few differences:

- `xorshift_range` models [`std::ranges::borrowed_range`](https://learn.microsoft.com/cpp/standard-library/range-concepts#borrowed_range), but `xorshift_generator` does not.
- `xorshift_range` models [`std::ranges::forward_range`](https://learn.microsoft.com/cpp/standard-library/range-concepts#forward_range), but `xorshift_generator` only models [`std::ranges::input_range`](https://learn.microsoft.com/cpp/standard-library/range-concepts#input_range).
- `xorshift_range` is copyable, but `xorshift_generator` is move-only.

We'll look at the reasons behind these shortly. Whether these tradeoffs are worth it for you depends on your use cases.

## Design Decisions Taken

There are several potential designs for a `std::generator`-like type, all of which have different tradeoffs and knock-on effects on how the type can be used.

### Copyability

Specializations of `std::generator` and their iterators are move-only. This is because a coroutine's state is a unique resource: you cannot perform a deep copy of a coroutine, and resuming a coroutine through one handle to it will be visible through all other handles.

### Range and Iterator Category

As another consequence of a coroutine's state being a unique resource, specializations of `std::generator` model `std::ranges::input_range`, and their iterators model `std::input_iterator`. This means that `std::generators` are single-pass ranges, which limits the set of range adaptors and algorithms that you can use with them. For example, you cannot pass a generator to [`std::ranges::max_element`](https://en.cppreference.com/w/cpp/algorithm/ranges/max_element), because it requires a forward range.

### Synchronicity

`std::generator` is synchronous. This means that you cannot [`co_await`](https://en.cppreference.com/w/cpp/language/coroutines#co_await) an asynchronous operation inside the body of the coroutine that returns a `std::generator`.

### Recursiveness

`std::generator` is recursive in that a coroutine that returns a specialization of `std::generator` may yield a `std::generator` of the same type directly rather than having to yield its values one-by-one. It's easier to understand with an example.

Say we have a binary tree that stores integers, and we want to yield all of its elements in order. We might write code like this:

```cpp
struct tree {
    tree* left;
    tree* right;
    int value;
};
std::generator<int> yield_all_loop(const tree& t) {
    if (t.left) {
        for (auto l : yield_all_loop(*t.left)) {
            co_yield l;
        }
    }

    co_yield t.value;

    if (t.right) {
        for (auto r : yield_all_loop(*t.right)) {
            co_yield r;
        }
    }
}
```

We recursively call `yield_all_loop` on the left and right subtrees and loop over the elements of each, yielding their values. This results in the number of coroutine resumptions/suspensions growing linearly with the depth of the tree. That is, if all branches of the tree are the same size and the tree has a depth of 16, then 16 coroutines will be resumed and suspended every time a value is requested. That's a lot of overhead.

`std::generator` allows you to yield the generators for the subtrees directly rather than having to manually yield their values all the way up the call stack. This is supported by the [`std::ranges::elements_of`](https://en.cppreference.com/w/cpp/ranges/elements_of) type, which doesn't do anything other than indicate that we want to yield the elements of a generator rather than the generator itself. The code looks like this:

```cpp
std::generator<int> yield_all_direct(const tree& t) {
    if (t.left) {
         co_yield std::ranges::elements_of(yield_all_direct(*t.left));
    }
    co_yield t.value;
    if (t.right) {
        co_yield std::ranges::elements_of(yield_all_direct(*t.right));
    }
}
```

This eliminates the linear growth issue. On my laptop, with a full tree with a depth of 16, this version runs twice as fast as the loop-based version.

### Reference/Value Type Shenanigans

The design space for deciding what [`std::ranges::range_reference_t`](https://learn.microsoft.com/cpp/standard-library/ranges-alias-templates#range_reference_t) and [`std::ranges::range_value_t`](https://learn.microsoft.com/cpp/standard-library/ranges-alias-templates#range_value_t) should be for a generator type and how these can be customized is surprisingly complex. This is because we want to support yielding and dereferencing to both reference and value types, while avoiding both dangling references and unnecessary copies. Ideally, we also shouldn't need to always specify the first template parameter as a reference type, i.e. `std::generator<std::string>` should compile, and iterators into it should avoid copying the yielded strings when dereferenced.

The design that the committee landed on for `std::generator` is that you can supply two template arguments to tune the reference and value types. If you only supply one, let's call it `Ref`, then the reference type is `Ref&&` and the value type is `std::remove_cvref_t<Ref>`. What this means in practice is that dereferencing the generator's iterators gives references, avoiding copies, and machinery that relies on `std::ranges::range_value_t` will act on values of the given type. Again, an example with code:

```cpp
std::generator<std::string> gen() {
    std::string hello = "hello";
    co_yield hello; // 0 copies
    co_yield "Hello"; // 1 copy (conversion from const char* to std::string)
}
int main() {
    for (auto&& s : gen()) {} // 0 copies
    //copies all strings (no dangling refs)
    auto vec = std::ranges::to<std::vector>(gen());
}
```

This all acts as we expect. It compiles, we avoid all the copies we can (except for the string literal), and we don't avoid copies we shouldn't. If we want to avoid copying that string literal, we could choose to instead generate [`std::string_views`](https://learn.microsoft.com/cpp/standard-library/string-view), but this has a problem:

```cpp
std::generator<std::string_view> gen() {
    std::string hello = "hello";
    co_yield hello; // 0 copies of string data
    co_yield "Hello"; // 0 copies
}

int main() {
    for (auto s : gen()) {} // 0 copies
    // uh oh, dangling references
    auto vec = std::ranges::to<std::vector>(gen());
}
```

In this case, the value type of the generator is `std::string_view`, so [`std::ranges::to`](https://en.cppreference.com/w/cpp/ranges/to) copies everything into a `std::vector<std::string_view>`, which holds a bunch of dangling references. Not ideal.

The solution is to manually specify the value type of the generator with the second template argument:

```cpp
std::generator<std::string_view, std::string> gen() {
    std::string hello = "hello";
    co_yield hello; // 0 copies of string data
    co_yield "Hello"; // 0 copies
}

int main() {
    for (auto s : gen()) {} // 0 copies
    // copies all strings, no dangling ref
    auto vec = std::ranges::to<std::vector>(gen());
}
```

This is the best of all worlds.

The moral is: if the template parameter you're supplying to `std::generator` has reference semantics, think about manually supplying a reasonable value type to avoid dangling references.

### Allocator Support

Coroutines require the compiler to generate code that tracks the state of the coroutine and its local variables. This is called a _coroutine frame_ or _activation record_. In general, the compiler allocates the coroutine frame on the heap unless it can detect that it never outlives its caller, in which case it instead allocates the frame on the caller's stack. This optimization is called the [_coroutine Heap Allocation eLision Optimization_](https://wg21.link/p0981) (HALO). By default, `std::generator` uses `std::allocator` for allocating its coroutine frame. In case you want more fine-grained control over where the frame for your `std::generator` is allocated, it supports supplying an allocator in a few different ways.

First, you can add an allocator to the coroutine's parameter list:

```cpp
template <class Allocator>
std::generator<int> f(std::allocator_arg_t, Allocator alloc);

// Usage
f(std::allocator_arg, MyAlloc{});
```

The first parameter must be `std::allocator_arg_t`, then the second parameter defines the allocator to use.

You can also supply the allocator to use as the third template argument for `std::generator`:

```cpp
std::generator<int, void, StatelessAllocator<int>> f();

// Usage
f();
```

Finally, you can combine these two methods if you have a stateful allocator that you want to specify the type of statically:

```cpp
std::generator<int, void, StatefulAllocator<int>>
f(std::allocator_arg_t, StatefulAllocator<int> alloc);

// Usage
f(std::allocator_arg, some_allocator); // must be convertible to StatefulAllocator<int>
```

## A Short Note on Performance

Current implementations of `std::generator` for both MSVC and libstdc++/GCC introduce some overhead. In the above `xorshift` sample, the generator version shows around a 3x slowdown with MSVC and 2x slowdown with GCC. We hope to improve on this in future versions of the compiler by, for example, enabling HALO for this use case.
