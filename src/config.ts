export const SITE = {
  website: "https://tartanllama.xyz/", // replace this with your deployed domain
  author: "Sy Brand",
  profile: "https://tartanllama.xyz/",
  desc: "Personal blog for Sy Brand.",
  title: "Sy Brand",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 5,
  postPerPage: 40,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "",
    url: "",
  },
  dynamicOgImage: true,
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Europe/London", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  redirects: {
    "/c++/2016/07/18/stack-and-heap": "/posts/stack-and-heap",
    "/stack-and-heap.html": "/posts/stack-and-heap",
    "/stack-and-heap": "/posts/stack-and-heap",
    "/c++/2016/07/20/structured-bindings": "/posts/structured-bindings",
    "/structured-bindings.html": "/posts/structured-bindings",
    "/structured-bindings": "/posts/structured-bindings",
    "/c++/2016/07/28/integral_variable": "/posts/integral-variable",
    "/integral_variable.html": "/posts/integral-variable",
    "/integral_variable": "/posts/integral-variable",
    "/c++/2016/08/09/try-catch-rethrow": "/posts/try-catch-rethrow",
    "/try-catch-rethrow.html": "/posts/try-catch-rethrow",
    "/try-catch-rethrow": "/posts/try-catch-rethrow",
    "/c++/2016/10/18/declare-class-in-func/": "/posts/declare-class-in-func",
    "/declare-class-in-func.html": "/posts/declare-class-in-func",
    "/declare-class-in-func": "/posts/declare-class-in-func",
    "/c++/2016/11/01/default-args": "/posts/selective-default-template-args",
    "/default-args": "/posts/selective-default-template-args",
    "/default-args.html": "/posts/selective-default-template-args",
    "/exploding-tuples-fold-expressions.html":
      "/posts/exploding-tuples-fold-expressions/",
    "/exploding-tuples-fold-expressions":
      "/posts/exploding-tuples-fold-expressions/",
    "/c++/2016/11/10/exploding-tuples-fold-expressions/":
      "/posts/exploding-tuples-fold-expressions/",
    "/c++/2016/12/02/type-erasure-unified-call":
      "/posts/type-erasure-unified-call",
    "/type-erasure-unified-call.html": "/posts/type-erasure-unified-call",
    "/type-erasure-unified-call": "/posts/type-erasure-unified-call",
    "/c++/2016/12/12/if-constexpr": "/posts/if-constexpr",
    "/if-constexpr.html": "/posts/if-constexpr",
    "/if-constexpr": "/posts/if-constexpr",
    "/c++/2017/01/03/deduction-on-the-left": "/posts/lazy-generators",
    "/deduction-on-the-left.html": "/posts/lazy-generators",
    "/deduction-on-the-left": "/posts/lazy-generators",
    "/c++/2017/01/11/deduction-for-class-templates":
      "/posts/class-template-argument-deduction",
    "/deduction-for-class-templates.html":
      "/posts/class-template-argument-deduction",
    "/deduction-for-class-templates":
      "/posts/class-template-argument-deduction",
    "/c++/2017/01/20/initialization-is-bonkers/":
      "/posts/cpp-initialization-is-bonkers",
    "/initialization-is-bonkers.html": "/posts/cpp-initialization-is-bonkers",
    "/initialization-is-bonkers": "/posts/cpp-initialization-is-bonkers",
    "/keyboards/2017/02/28/my-first-keyboard/": "/posts/my-first-keyboard",
    "/my-first-keyboard.html": "/posts/my-first-keyboard",
    "/my-first-keyboard": "/posts/my-first-keyboard",
    "/c++/2017/03/21/writing-a-linux-debugger-setup":
      "/posts/writing-a-linux-debugger/setup",
    "/writing-a-linux-debugger-setup.html":
      "/posts/writing-a-linux-debugger/setup",
    "/writing-a-linux-debugger-setup": "/posts/writing-a-linux-debugger/setup",
    "/c++/2017/03/24/writing-a-linux-debugger-breakpoints/":
      "/posts/writing-a-linux-debugger/breakpoints",
    "/writing-a-linux-debugger-breakpoints.html":
      "/posts/writing-a-linux-debugger/breakpoints",
    "/writing-a-linux-debugger-breakpoints":
      "/posts/writing-a-linux-debugger/breakpoints",
    "/c++/2017/03/31/writing-a-linux-debugger-registers":
      "/posts/writing-a-linux-debugger/registers-and-memory",
    "/writing-a-linux-debugger-registers.html":
      "/posts/writing-a-linux-debugger/registers-and-memory",
    "/writing-a-linux-debugger-registers":
      "/posts/writing-a-linux-debugger/registers-and-memory",
    "/c++/2017/04/05/writing-a-linux-debugger-elf-dwarf":
      "/posts/writing-a-linux-debugger/elves-and-dwarves",
    "/writing-a-linux-debugger-elf-dwarf.html":
      "/posts/writing-a-linux-debugger/elves-and-dwarves",
    "/writing-a-linux-debugger-elf-dwarf":
      "/posts/writing-a-linux-debugger/elves-and-dwarves",
    "/c++/2017/04/24/writing-a-linux-debugger-source-signal":
      "/posts/writing-a-linux-debugger/source-and-signals",
    "/writing-a-linux-debugger-source-signal.html":
      "/posts/writing-a-linux-debugger/source-and-signals",
    "/writing-a-linux-debugger-source-signal":
      "/posts/writing-a-linux-debugger/source-and-signals",
    "/c++/2017/04/27/accu-day-1":
      "/posts/trip-reports/accuconf-2017-workshop-day",
    "/accu-day-1.html": "/posts/trip-reports/accuconf-2017-workshop-day",
    "/accu-day-1": "/posts/trip-reports/accuconf-2017-workshop-day",
    "/c++/2017/05/02/accu-trip-report": "/posts/trip-reports/accuconf-2017",
    "/accu-trip-report.html": "/posts/trip-reports/accuconf-2017",
    "/accu-trip-report": "/posts/trip-reports/accuconf-2017",
    "/c++/2017/05/06/writing-a-linux-debugger-dwarf-step":
      "/posts/writing-a-linux-debugger/source-level-stepping",
    "/writing-a-linux-debugger-dwarf-step.html":
      "/posts/writing-a-linux-debugger/source-level-stepping",
    "/writing-a-linux-debugger-dwarf-step":
      "/posts/writing-a-linux-debugger/source-level-stepping",
    "/c++/2017/05/19/sycl": "/posts/sycl",
    "/sycl.html": "/posts/sycl",
    "/sycl": "/posts/sycl",
    "/c++/2017/06/19/writing-a-linux-debugger-source-break":
      "/posts/writing-a-linux-debugger/source-level-breakpoints",
    "/writing-a-linux-debugger-source-break.html":
      "/posts/writing-a-linux-debugger/source-level-breakpoints",
    "/writing-a-linux-debugger-source-break":
      "/posts/writing-a-linux-debugger/source-level-breakpoints",
    "/c++/2017/06/24/writing-a-linux-debugger-unwinding":
      "/posts/writing-a-linux-debugger/stack-unwinding",
    "/writing-a-linux-debugger-unwinding.html":
      "/posts/writing-a-linux-debugger/stack-unwinding",
    "/writing-a-linux-debugger-unwinding":
      "/posts/writing-a-linux-debugger/stack-unwinding",
    "/c++/2017/06/28/metaclasses-edsl": "/posts/metaclasses-for-edsls",
    "/metaclasses-edsl.html": "/posts/metaclasses-for-edsls",
    "/metaclasses-edsl": "/posts/metaclasses-for-edsls",
    "/c++/2017/07/20/c++17-attributes": "/posts/cpp17-attributes",
    "/c++17-attributes.html": "/posts/cpp17-attributes",
    "/c++17-attributes": "/posts/cpp17-attributes",
    "/c++/2017/07/26/writing-a-linux-debugger-variables":
      "/posts/writing-a-linux-debugger/handling-variables",
    "/writing-a-linux-debugger-variables.html":
      "/posts/writing-a-linux-debugger/handling-variables",
    "/writing-a-linux-debugger-variables":
      "/posts/writing-a-linux-debugger/handling-variables",
    "/c++/2017/08/01/writing-a-linux-debugger-advanced-topics":
      "/posts/writing-a-linux-debugger/advanced-topics",
    "/writing-a-linux-debugger-advanced-topics.html":
      "/posts/writing-a-linux-debugger/advanced-topics",
    "/writing-a-linux-debugger-advanced-topics":
      "/posts/writing-a-linux-debugger/advanced-topics",
    "/c++/2017/08/08/silly-syntax": "/posts/silly-cpp-syntax",
    "/silly-syntax.html": "/posts/silly-cpp-syntax",
    "/silly-syntax": "/posts/silly-cpp-syntax",
    "/learning-cpp": "/posts/learning-cpp",
    "/detection-idiom": "/posts/detection-idiom",
    "/meetingcpp-2017": "/posts/trip-reports/meeting-cpp-2017",
    "/optional-expected": "/posts/optional-and-expected",
    "/exception-data": "/posts/a-call-for-data-on-exceptions",
    "/passing-overload-sets": "/posts/passing-overload-sets",
    "/inline-hints": "/posts/inline-hints",
    "/no-pointers": "/posts/no-more-pointers",
    "/llvm-alias-analysis": "/posts/llvm-alias-analysis",
    "/accumulate-vs-reduce": "/posts/accumulate-vs-reduce",
    "/function-template-partial-ordering":
      "/posts/function-template-partial-ordering",
    "/simple-named-boolean-parameters": "/posts/simple-named-boolean-arguments",
    "/spaceship-operator": "/posts/spaceship-operator",
    "/guaranteed-copy-elision": "/posts/guaranteed-copy-elision",
  },
} as const;
