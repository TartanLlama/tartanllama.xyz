---
author: Sy Brand
pubDatetime: 2023-04-13
title: "C++23's Fold Algorithms"
draft: false
tags:
  - C++
  - C++23
canonicalURL: https://tartanllama.xyz/posts/fold-algorithms
description: Better folds for a modern language
---

_Originally published on [Microsoft's C++ blog](https://devblogs.microsoft.com/cppblog/cpp23s-new-fold-algorithms/)._

## Table of Contents

C++20 added new versions of the standard library algorithms which take ranges as their first argument rather than iterator pairs, alongside other improvements. However, key algorithms like `std::accumulate` were not updated. This has been done in C++23, with the new `std::ranges::fold_*` family of algorithms. The standards paper for this is [P2322](https://wg21.link/p2322) and was written by Barry Revzin. In this post I'll explain the benefits of the new "rangified" algorithms, talk you through the new C++23 additions, and explore some of the design space for fold algorithms in C++.

## Background: Rangified Algorithms

C++20's algorithms make several improvements to the old iterator-based ones. The most obvious is that they now can take a range instead of requiring you to pass iterator pairs. But they also allow passing a "projection function" to be called on elements of the range before being processed, and the use of C++20 concepts for constraining their interfaces more strictly defines what valid uses of these algorithms are. These changes allow you to make refactors like:

```cpp
// C++17 algorithm
cat find_kitten(const std::vector<cat>& cats) {
    return *std::find_if(cats.begin(), cats.end(),
        [](cat const& c) { return c.age == 0; });
}

// C++20 algorithm
cat find_kitten(std::span<cat> cats) {
    return *std::ranges::find(cats, 0, &cat::age);
}
```

The differences here are:

Instead of having to pass `cats.begin()` and `cats.end()`, we just pass `cats` itself.
Since we are comparing a member variable of the `cat` to `0`, in C++17 we need to use `std::find_if` and pass a closure which accesses that member and does the comparison. Since the rangified algorithms support projections, in C++20 we can use `std::ranges::find` and pass `&cat::age` as a projection, getting rid of the need for the lambda completely.
These improvements can greatly clean up code which makes heavy use of the standard library algorithms.

Unfortunately, alongside the algorithms which reside in the `<algorithm>` header, there are also several important ones in the `<numeric>` header, and these were not rangified in C++20[^1]. In this post we're particularly interested in `std::accumulate` and `std::reduce`.

## `accumulate` and `reduce`

`std::accumulate` and `std::reduce` are both [fold](<https://en.wikipedia.org/wiki/Fold_(higher-order_function)>) operations. They _reduce_ or _combine_ multiple values into a single value. Both take two iterators, an initial value, and a binary operator (which defaults to `+`). They then run the given operator over the range of values given by the iterators, collecting a result as they go. For instance, given `std::array<int,3> arr = {1,2,3}`, `std::accumulate(begin(arr), end(arr), 0, std::plus())` will run `(((0 + 1) + 2) + 3)`. Or `std::accumulate(begin(arr), end(arr), 0, f)` will run `f(f(f(0, 1), 2), 3)`.

These functions are both what are called _left folds_ because they run from left to right. There are also _right folds_, which as you may guess, run from right to left. For the last example a right fold would look like `f(1, f(2, f(3, 0)))`. For some operations, like `+`, these would give the same result, but for operations which are not [associative](https://en.wikipedia.org/wiki/Associative_property) (like `-`), it could make a difference.

So why do we have both `std::accumulate` and `std::reduce`? `std::reduce` was added in C++17 as one of the many [parallel algorithms](https://devblogs.microsoft.com/cppblog/using-c17-parallel-algorithms-for-better-performance/) which let you take advantage of parallel execution for improved performance. The reason it has a different name than `std::accumulate` is because it has different constraints on what types and operations you can use: namely the operation used must be both associative and [commutative](https://en.wikipedia.org/wiki/Commutative_property).

To understand why, consider the following code:

```cpp
std::array<int,8> a {0,1,2,3,4,5,6,7};
auto result = std::reduce(std::execution::par, //execute in parallel
    begin(a), end(a), 0, f);
```

If `f` is associative, then `std::reduce` could reduce the first half of `a` on one CPU core, reduce the second half of a on another core, then call `f` on the result. However, if `f` is not associative, this could result in a different answer than carrying out a pure left fold. As such, requiring associativity lets `std::reduce` distribute the reduction across multiple units of execution.

Requiring commutativity likewise enables some potential optimizations. One is that the implementation is free to reorder operations as it likes. If, for example, some calls to `f` take longer than others, `reduce` could use whichever intermediate results are available without having to wait around for the "right" result. Commutativity also enables vectorization when using the `std::execution::par_unseq` policy. For example, if `f` is addition, the first half of `a` could be loaded into one vector register, the second half loaded into another, and a vector addition executed on them. This would result in `(0 + 4) + (1 + 5) + (2 + 6) + (3 + 7)`. Notice that the operands have been interleaved: this requires commutativity.

## `std::ranges::fold_*`

C++23 comes with six fold functions which fulfil different important use cases. The one you'll reach for most is `std::ranges::fold_left`.

### `fold_left`

You can use `fold_left` in place of calls to `std::accumulate`. For instance, I have three cats, and when I brush them, I collect all the loose fur as I go so I can throw it away:

```cpp
fur brush(fur existing_fur, cat& c);
std::vector<cat> cats = get_cats();

// C++20
auto loose_fur = std::accumulate(begin(cats), end(cats), fur{}, brush);
// C++23
auto loose_fur = std::ranges::fold_left(cats, fur{}, brush);

throw_away(loose_fur);
```

`std::accumulate` is really a generic left fold, but its name suggests summation, and the defaulting of the binary operator to addition further contributes to this. This makes uses of `accumulate` for non-summation purposes look a little clunky. This is why the new version is instead called `fold_left`, and does not have a default operator.

### `fold_right`

As you can probably guess, since there's a `fold_left` function, there's also a `fold_right` function. For associative operations like `brush`, there's no real difference in behaviour. But say we have a function which takes some amount of food and feeds half of it to a cat, returning the leftovers:

```cpp
food feed_half(cat& c, food f) {
    auto to_feed = f / 2;
    c.eaten += to_feed;
    return f - to_feed;
}
```

This operation is not associative, therefore using `fold_left` or `fold_right` would result in feeding different cats different amounts of food. We could call `fold_right` like this:

```cpp
std::vector<cat> cats = get_cats();
//feed cats from right to left, starting with 100 food
auto leftovers = std::ranges::fold_right(cats, 100, feed_half);
```

Note that for `fold_right`, the order of arguments to the operator are flipped from `fold_left`: the accumulator is on the right rather than the left.

In these examples we've been able to pick a reasonable initial value for our folds (`fur{}` in the first, `100` in the second). But how do we pick our initial element? What if there is no good initial value to pick?

### Aside on Initial Elements

`std::reduce` allows omitting the initial element for the fold, in which case it uses a value-initialized object of the given iterator's value type (e.g. `0` for `int`). This can be handy in some cases, such as summing integers, but doesn't work so well in others, such as taking the product of integers. Usually what we want for the initial element is some _identity element_ for the value type of the range with respect to the given binary operator. Given any object `x` of type `T` and operation `f`, the identity element `i`d is one for which `f(id,x) == x`. For example, the identity element for the pair `{int, operator+}` is `0`. For `{int, operator*}` it's `1`. For `{std::string, operator+}` it's `""`.

These pairs of types and associative binary operators which have an identity element turn out to be surprisingly common in programming, they're called [monoids](https://en.wikipedia.org/wiki/Monoid). Ben Deane has several great talks on monoids in C++; I'd highly recommend [watching this one](https://www.youtube.com/watch?v=INnattuluiM).

We don't have a way to easily get at the identity element of a given monoid in C++. You could imagine implementing some `monoid_traits` class template which could be specialised by users to support custom types. This could let `fold_left` be implemented something like (omitting constraints for brevity):

```cpp
template <class Rng, class F, class T = std::ranges::range_value_t<Rng>>
constexpr T fold_left (Rng&& rng, F&& op, T init = monoid_traits<std::ranges::range_value_t<Rng>, F>::identity_element());
```

Maybe you think that's horrifying and too much work. I might agree for many cases. I do think it's an interesting design area though, and I know [GraphBLAS](https://graphblas.org/) does something like this; there's a [CppCon talk](https://www.youtube.com/watch?v=xMBNCtFV8sI) which shows the kinds of things they do with monoid traits. [P1813](https://wg21.link/p1813) explored a similar idea for a concepts design for numeric algorithms.

I think the C++23 design makes the right decision in simply not defaulting the initial element at all. This forces you to think about it and not accidentally supply a value-initialized value in cases where it's not correct.

### `fold_left_first` and `fold_right_last`

But what if you don't have an identity element for your type? Then you need to pull out the first element by-hand, which is quite unwieldly and a bit tricky to get right for input iterators:

```cpp
auto b = std::ranges::begin(rng);
auto e = std::ranges::end(rng);
auto init = *b;
fold_left(std::ranges::next(b), e, std::move(init), f);
```

As such, many languages provide an alternative `fold` function which uses the first element of the range as the initial element (thus additionally requiring the range to be non-empty).

The version we have in C++23 has this too, it calls them `fold_left_first` and `fold_right_last`. This lets you simply write:

```cpp
std::ranges::fold_left_first(rng, f);
```

Much better.

### `fold_left_with_iter` and `fold_left_first_with_iter`

The final two versions of `fold` which are in C++23 are ones which expose an additional result computed by the fold: the end iterator. Recall that for some ranges, the type returned by `std::ranges::end` is not an iterator, but a _sentinel_: some rule for when to finish iteration. For some ranges, computing the iterator for the range which is equal to what `std::ranges::end` returns may actually be quite expensive. Since carrying out the fold necessarily requires computing this iterator, C++23 provides functions which return this iterator alongside the value computed.

For example, say we have a collection of cats sorted by age, and we have some food which is specially formulated for younger cats. We could split the food between the younger cats like so:

```cpp
std::vector<cat> cats = get_sorted_cats();
auto young_cats = cats | std::views::take_while([](auto c) { return c.age < 7; });
auto leftover_food = std::ranges::fold_left(young_cats, food_for_young_cats, feed_half);
```

However, now if we want to give some other food to the older cats, we need to recompute the point in `cats` where the young cats stop and the older cats begin:

```cpp
auto first_old_cat = std::ranges::find_if(cats, [](auto c) { return c.age >= 7; });
give_some_other_food(first_old_cat, std::ranges::end(cats));
```

`fold_left_with_iter` lets you avoid the recomputation:

```cpp
std::vector<cat> cats = get_sorted_cats();
auto young_cats = cats | std::views::take_while([](auto c) { return c.age < 7; });
auto [first_old_cat, leftover_food] = std::ranges::fold_left_with_iter(young_cats, food_for_young_cats, feed_half);

give_some_other_food(first_old_cat, std::ranges::end(cats));
```

## What About Reduce?

The `fold` family of functions extend and replace `std::accumulate`. But what about `std::reduce`? `std::ranges::reduce` is planned, but no one has written the necessary standards proposal for it yet. It wouldn't be _that_ different from `std::ranges::fold_*`, but there's some subtle design points, like different constraints on the binary operator to allow `op(*it, acc)`, `op(acc, *it)`, and `op(*it, *it)`.

## What About Projections?

I said at the start that the rangified algorithms have 3 main benefits:

- Can pass a range rather than iterator pair
- Are constrained by concepts
- Support projection functions

Only the first two apply for `fold_*`, however: projection functions aren't supported for a rather subtle reason. You can see [P2322r6](https://wg21.link/p2322r6) for all the details, but essentially, for the `fold_left_first*` and `fold_right_last*` overloads, allowing projections would incur an extra copy even in cases where it shouldn't be required. As such, projections were removed from those overloads, and then from the remaining three for consistency.

If you want to use a projection function with `fold_left`, you could do something like:

```cpp
auto res = fold_left(rng | std::views::transform(projection), init, f);
```

## Go Forth and Fold!

I hope this has helped you understand the function and utility of these new operations, and that they can help make your code better.

## Acknowledgements

Thanks to Christopher Di Bella, Barry Revzin, and Stephan T. Lavavej for feedback and information.

---

[^1]: Why? Quoting Casey Carter: "Every time someone asks why we didn't cover `<numeric>` and `<memory>` algorithms: We thought 187 pages of Technical Specification was enough."
