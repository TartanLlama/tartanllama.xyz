---
author: Sy Brand
pubDatetime: 2017-11-14
title: "Meeting C++ 2017 Trip Report"
draft: false
tags:
  - Trip Report
  - Meeting C++
canonicalURL: https://tartanllama.xyz/posts/trip-reports/meeting-cpp-2017
description: My first trip to Meeting C++
---

This year was my first time at Meeting C++. It was also the first time I gave a full-length talk at a conference. But most of all it was a wonderful experience filled with smart, friendly people and excellent talks. This is my report on the experience. I hope it gives you an idea of some talks to watch when they're up on YouTube, and maybe convince you to go along and submit talks next year!

## The Venue

The conference was held at the Andel's Hotel in Berlin, which is a very large venue on the East side of town, about 15 minutes tram ride from Alexanderplatz. All the conference areas were very spacious and there were always places to escape to when you need a break from the noise, or places to sit down on armchairs when you need a break from sitting down on conference chairs.

## The People

Some people say they go to conferences for the talks, and for the opportunity to interact with the speakers in the Q&As afterwards. The talks are great, but I went for the people. I had a wonderful time meeting those whom I knew from Twitter or the CppLang Slack, but had never encountered in real life; catching up with those who I've met at other events; and talking to those I'd never had interacted with before. There were around 600 people at the conference, primarily from Europe, but many from further-afield. I didn't have any negative encounters with anyone at the conference, and Jens was very intentional about publicising the Code of Conduct and having a diverse team to enforce it, so it was a very positive atmosphere.

## Day 1

### Keynote: [Sean Parent](https://twitter.com/SeanParent) -- Better Code: Human interface

After a short introduction from Jens, the conference kicked off with a keynote from Sean Parent. Although he didn't say it in these words, the conclusion I took out of it was that all technology requires some thought about user experience (UX if we're being trendy). Many of us will think of UX as something centred around user interfaces, but it's more than that. If you work on compilers (like I do), then your UX work involves consistent compiler flags, friendly error messages and useful tooling. If you work on libraries, then your API is your experience. Do your functions do the most obvious thing? Are they well-documented? Do they come together to create terse, correct, expressive, efficient code? Sean's plea was for us to consider all of these things, and to embed them into how we think about coding. Of course, it being a talk about good code from Sean Parent, it had some great content about composing standard algorithms. I would definitely recommend checking out the talk if what I've just written sounds thought-provoking to you.

### [Peter Goldsborough](http://www.goldsborough.me/) -- Deep Learning with C++

Peter gave a very well-structured talk, which went down the stack of technology involved in deep learning -- from high-level libraries to hardware -- showing how it all works in theory. He then went back up the stack showing the practical side, including a few impressive live demos. It covers a lot of content, giving a pretty comprehensive introduction. It does move at a very quick pace though, so you probably don't want to watch this one on 1.5x on YouTube!

### [Jonathan Boccara](https://twitter.com/JoBoccara) -- Strong types for strong interfaces

This talk was quite a struggle against technical difficulties; starting 15 minutes late after laptop/projector troubles, then having Keynote crash as soon as the introduction was over. Fortunately, Jonathan handled it incredibly well, seeming completely unfazed as he gave an excellent presentation and even finished on time.

The talk itself was about using strong types (a.k.a. opaque typedefs) to strengthen your code's resilience to programmer errors and increase its readability. This was a distillation of some of the concepts which Jonathan has written about in a [series on his blog](https://www.fluentcpp.com/2016/12/05/named-constructors/). He had obviously spent a lot of time rehearsing this talk and put a lot of thought into the visual design of the slides, which I really appreciated.

### [Sy Brand](https://twitter.com/TartanLlama) (me!) -- How C++ Debuggers Work

This was my first full length talk at a conference, so I was pretty nervous about it, but I think it went really well: there were 150-200 people there, I got some good questions, and a bunch of people came to discuss the talk with me in the subsequent days. I screwed up a few things -- like referring to the audience as "guys" near the start and finishing a bit earlier than I would have liked -- but all in all it was a great experience.

My talk was an overview of almost all of the commonly-used parts of systems-level debuggers. I covered breakpoints, stepping, debug information, object files, operating system interaction, expression evaluation, stack unwinding and a whole lot more. It was a lot of content, but I think I managed to get a good presentation on it. I'd greatly appreciate any feedback of how the talk could be improved in case I end up giving it at some other conference in the future!

### [Joel Falcou](https://twitter.com/joel_f) -- The Three Little Dots and the Big Bad Lambdas

I'm a huge metaprogramming nerd, so this talk on using lambdas as a kind of code injection was very interesting for me. Joel started the talk with an introduction to how OCaml allows code injection, and then went on to show how you could emulate this feature in C++ using templates, lambdas and inlining in C++. It turned out that he was going to mostly talk about the indices trick for unpacking tuple-like things, fold expressions (including how to emulate them in C++11/14), and template-driven loop unrolling -- all of which are techniques I'm familiar with. However, I hadn't thought about these tools in the context of compile-time code injection, and Joel presented them very well, so it was still a very enjoyable talk. I particularly enjoyed hearing that he uses these in production in his company in order to fine-tune performance. He showed a number of benchmarks of the linear algebra library he has worked on against another popular implementation which hand-tunes the code for different architectures, and his performance was very competitive. A great talk for demonstrating how templates can be used to optimise your code!

### [Diego Rodriguez-Losada](https://twitter.com/diegorlosada) -- Conan C++ Quiz

This was one of the highlights of the whole conference. The questions were challenging, thought-provoking, and hilarious, and Diego was a fantastic host. He delivered all the content with charisma and wit, and was obviously enjoying himself: maybe my favourite part of the quiz was the huge grin he wore as everyone groaned in incredulity when the questions were revealed. I don't know if the questions will go online at some point, but I'd definitely recommend giving them a shot if you get the chance.

## Day 2

### Keynote: [Kate Gregory](https://twitter.com/gregcons) -- It's complicated!

Kate gave a really excellent talk which examined the complexities of writing good code, and those of C++. The slide which I saw the most people get their phones out for said "Is it important to your ego that you're really good at a complicated language?", which I think really hit home for many of us. C++ is like an incredibly intricate puzzle, and when you solve a piece of it, you feel good about it and want to share your success with others. However, sometimes, we can make that success, that understanding, part of our identity. Neither Kate or I are saying that we shouldn't be proud of our domination over the obscure parts of the language, but a bit of introspection about how we reflect this understanding and share it with others will go a long way.

Another very valuable part of her talk was her discussion on the importance of good names, and how being able to describe some idiom or pattern helps us to talk about it and instruct others. Of course, this is what design patterns were originally all about, but Kate frames it in a way which helps build an intuition around how this common language works to make us better programmers. A few days after the conference, this is the talk which has been going around my head the most, so if you watch one talk from this year's conference, you could do a lot worse than this one.

### [Felix Petriconi](https://twitter.com/FelixPetriconi) -- There Is A New Future

Felix presented the `std::future`-a-like library which he and Sean Parent have been working on. It was a very convincing talk, showing the inadequacies of `std::future`, and how their implementation fixes these problems. In particular, Felix discussed continuations, cancellations, splits and forks, and demonstrated their utility. You can find the library [here](https://github.com/stlab/libraries).

### [Lukas Bergdoll](https://github.com/Voultapher) -- Is `std::function` really the best we can do?

If you've read a lot of code written by others, I'm sure you'll have seen people misusing `std::function`. This talk showed why so many uses are wrong, including live benchmarks, and gave a number of alternatives which can be used in different situations. I particularly liked a slide which listed the conditions for `std::function` to be a good choice, which were:
{:.listhead}

- It has to be stored inside a container
- You really can't know the layout at compile time
- All your callable types are move and copyable
- You can constrain the user to exactly one signature

### `#include` meeting

[Guy Davidson](https://twitter.com/hatcat01) lead an open discussion about [`#include`](https://github.com/include-cpp/include), which is a diversity group for C++ programmers started by Guy and [Kate Gregory](https://twitter.com/gregcons) (I've also been helping out a bit). It was a very positive discussion in which we shared stories, tried to grapple with some of the finer points of diversity and inclusion in the tech space, and came up with some aims to consider moving forward. Some of the key outcomes were:
{:.listhead}

- We should be doing more outreach into schools and trying to encourage those in groups who tend to be discouraged from joining the tech industry.
- Some people would greatly value a resource for finding companies which really value diversity rather than just listing it as important on their website.
- Those of use who care about these issues can sometimes turn people away from the cause by not being sensitive to cultural, psychological or sociological issues; perhaps we need education on how to educate.

I thought this was a great session and look forward to helping develop this initiative and seeing where we can go with it. I'd encourage anyone who is interested to get on to the `#include` channel on the [CppLang Slack](https://cpplang.slack.com/), or to send pull requests to the [information repository](https://github.com/include-cpp/include).

### [Juan Bolívar](https://twitter.com/sinusoidalen) -- The most valuable values

Juan gave a very energetic, engaging talk about value semantics and his [Redux-](https://redux.js.org/)/[Elm-](http://elm-lang.org/)like C++ library, [lager](https://github.com/arximboldi/lager). He showed how these techniques can be used for writing clear, correct code without shared mutable state. I particularly like the time-travelling debugger which he presented, which allows you to step around the changes to your data model. I don't want to spoil anything, but there's a nice surprise in the talk which gets very meta.

## Day 3

### Lightning talks

I spent most of day three watching lightning talks. There were too many to discuss individually, so I'll just mention my favourites.

#### [Arvid Gerstmann](https://twitter.com/ArvidGerstmann) -- A very quick view into a compiler

Arvid gave a really clear, concise description of the different stages of compilation. Recommended if you want a byte-sized introduction to compilers.

#### Réka Nikolett Kovács -- `std::launder`

It's become a bit of a meme on the CppLang Slack that we don't talk about `std::launder`, as it's only needed if you're writing standard-library-grade generic libraries. Still, I was impressed by this talk, which explains the problem well and shows how `std::launder` (mostly) solves it. I would have liked more of a disclaimer about who the feature is for, and that there are still unsolved problems, but it was still a good talk.

#### Andreas Weis -- Type Punning Done Right

Strict aliasing violations are a common source of bugs if you're writing low level code and aren't aware of the rules. Andreas gave a good description of the problem, and showed how `memcpy` is the preferred way to solve it. I do wish he'd included an example of [`std::bit_cast`](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2016/p0476r1.html), which was just voted in to C++20, but it's a good lightning talk to send to your colleagues the next time they go type punning.

#### [Miro Knejp](https://twitter.com/mknejp) -- Is This Available?

Miro presented a method of avoiding awful `#ifdef` blocks by providing a template-based interface to everything you would otherwise preprocess. This is somewhat similar to what I talked about in my [`if constexpr`](https://blog.tartanllama.xyz/if-constexpr/) blog post, and I do something similar in production for abstracting the differences in hardware features in a clean, composable manner. As such, it's great to have a lightning talk to send to people when I want to explain the concept, and I'd recommend watching it if the description piques your interest. Now we just need a good name for it. Maybe the Template Abstracted Preprocessor (TAP) idiom? Send your thoughts to me and Miro!

#### Sy Brand (me!) -- `std::optional` and the M word

Someone who was scheduled to do a lightning talk didn't make the session, so I ended up giving an improvised talk about `std::optional` and monads. I didn't have any slides, so described `std::optional` as a glass which could either be empty, or have a value (in this case represented by a pen). I got someone from the audience to act as a function which would give me a doily when I gave it a pen, and acted out functors and monads using that. It turned out very well, even if I forgot how to write Haskell's bind operator (`>>=`) halfway through the talk!

#### Overall

I really enjoyed the selection of lightning talks. There was a very diverse range of topics, and everything flowed very smoothly without any technical problems. It would have been great if there were more speakers, since some people gave two or even three talks, but that means that more people need to submit! If you're worried about talking, a lightning talk is a great way to practice; if things go terribly wrong, then the worse that can happen is that they move on to the next speaker. It would have also been more fun if it was on the main track, or if there wasn't anything scheduled against them.

### Secret Lightning Talks

Before the final keynote there was another selection of lightning talks given on the keynote stage. Again, I'll just discuss my favourites.

#### [Guy Davidson](https://twitter.com/hatcat01) -- Diversity and Inclusion

Guy gave a heartfelt talk about diversity in the C++ community, giving reasons why we should care, and what we can do to try and encourage involvement for those in under-represented groups in our communities. This is a topic which is also very important to me, so it was great to see it being given an important place in the conference.

#### [Kate Gregory](https://twitter.com/gregcons) -- Five things I learned when I should have been dying

An even more personal talk was given by Kate about important things she learned when she was given her cancer diagnosis. It was a very inspiring call to not care about the barriers which may perceive to be in the way of achieving something -- like, say, going to talk at a conference -- and instead just trying your best and "doing the work". Her points really resonated with me; I, like many of us, have suffered from a lot of impostor syndrome in my short time in the industry, and talks like this help me to battle through it.

#### [Phil Nash](https://twitter.com/phil_nash) -- A Composable Command Line Parser

Phil's talk was on [Clara](https://github.com/philsquared/Clara), which is a simple, composable command line parser for C++. It was split off from his [Catch](https://github.com/catchorg/Catch2) test framework into its own library, and he's been maintaining it independently of its parent. The talk gave a strong introduction to the library and why you might want to use it instead of one of the other hundreds of command line parsers which are out there. I'm a big fan of the design of Clara, so this was a pleasure to watch.

### Keynote: [Wouter van Ooijen](https://twitter.com/WouterVanOoijen) -- What can C++ offer embedded, what can embedded offer C++?

To close out the conference, Wouter gave a talk about the interaction between the worlds of C++ and embedded programming. The two have been getting more friendly in recent years thanks to libraries like [Kvasir](https://github.com/kvasir-io/Kvasir) and talks by people like [Dan Saks](https://www.youtube.com/watch?v=D7Sd8A6_fYU) and [Odin Holmes](https://www.youtube.com/watch?v=dxRDWgLIAZg). Wouter started off talking about his work on space rockets, then motivated using C++ templates for embedded programming, showed us examples of how to do it, then finished off talking about what the C++ community should learn from embedded programming. If I'm honest, I didn't enjoy this keynote as much as the others, as I already had an understanding of the techniques he showed, and I was unconvinced by the motivating examples, which seemed like they hadn't been optimised properly (I had to leave early to catch a plane, so please someone tell me if he ended up clarifying them!). If you're new to using C++ for embedded programming, this may be a good introduction.

## Closing

That's it for my report. I want to thank Jens for organising such a great conference, as well as his staff and volunteers for making sure everything ran smoothly. Also thanks to the other speakers for being so welcoming to new blood, and all the other attendees for their discussions and questions. I would whole-heartedly recommend attending the conference and submitting talks, especially if you haven't done so before. Last but not least, a big thanks to my employer, [Codeplay](https://www.codeplay.com/) for sending me.
