---
author: Sy Brand
pubDatetime: 2017-04-27
title: "ACCUConf 2017 Workshop Day Report"
draft: false
tags:
  - Trip Report
  - ACCUConf
canonicalURL: https://tartanllama.xyz/posts/trip-reports/accuconf-2017-workshop-day
description: My introduction to Chapel
---

This week I'm very excited to be at ACCUConf, which is the second large conference I've attended since starting my career. My first conf was EuroLLVM in Edinburgh, where around twenty of my colleagues were there alongside me. This time I'm on my own in a city I don't know, so I'm looking forward to being forced to meet new people rather than having somewhere to hide and use as an excuse!

I'm going to be making notes on the talks which I attend, mostly for my own records, but hopefully others will find them useful too!

The conference runs over five days, the first of which was a set of day-long workshops. I decided to attend "A Programmer's Introduction to Chapel", as I had no experience in or knowledge of this language and am very interested in parallel computing.

The tutorial was given by Brad Chamberlain, who is the technical lead for the Chapel project. Brad was very friendly, helpful, and could answer all of my nichey technical questions well.

## Chapel?

From the website:

> Chapel is a modern programming language that is...
>
> - parallel: contains first-class concepts for concurrent and parallel computation
> - productive: designed with programmability and performance in mind
> - portable: runs on laptops, clusters, the cloud, and HPC systems
> - scalable: supports locality-oriented features for distributed memory systems
> - open-source: hosted on GitHub, permissively licensed

Chapel is developed by Cray, so obviously HPC is a major target market, but the language is also designed to be used for general parallel and concurrent programming, so you could use it for standard desktop applications.

And here's a hello world example which distributes the jobs among all of the available compute nodes:

```chapel
use CyclicDist;               // use the Cyclic distribution library
config const n = 100000;      // use ./a.out --n=<val> to override this default

forall i in {1..n} dmapped Cyclic(startIdx=1) do
  writeln("Hello from iteration ", i, " of ", n, " running on node ", here.id);
```

## Barrier to entry

Maybe a parallel language for HPC sounds a bit scary, but it was ridiculously easy to get up and running with examples on my laptop. It took more time to download the source over the hotel WiFi then it did to build it, compile an example and execute it.

## Interesting concepts

One of the key language features of Chapel is the _domain_, which is essentially a description of the shape of the data you'll be operating on. This is fairly similar to the concept of an ND range in OpenCL.

```chapel
const D = {1..10, 1..10};
var A : [D] real;
```

In this example, `D` describes a 10x10 2D index space and `A` is an array of real numbers which takes its shape from `D`.

We can then write a parallel loop which will execute some task over this array:

```chapel
forall (x,y) in A do
    A[x,y] = x*y;
```

This will automatically distribute the work over whatever compute cores we have in our machine.

My personal favourite feature was _promotion_, in which functions which take single elements over some type can be promoted automatically to functions which take multiple elements. Kind of like automatic vectorisation, but using multiple physical cores rather than vector units.

```chapel
proc negate(ref x: real) {
  x = -x;
}
```

This function takes a reference to a single real number and negates it. We could call it like so:

```chapel
var I = 42.42;
negate(I);
```

But we can also get implicit data parallelism by passing an array:

```chapel
var A = [1.2, 3.4, 5.6];
negate(A);
```

This is functionally equivalent to writing:

```chapel
forall a in A do
  negate(a);
```

For such a simple example the gains aren't massive, but I can see this allowing for some really expressive code carrying out very complex tasks.

## Conclusion

I very much enjoyed this tutorial and was quite impressed with Chapel. I'm interested to see how the language maps to things like GPUs in the future. If you want to get started with Chapel, go check out the website [here](http://chapel.cray.com/).
