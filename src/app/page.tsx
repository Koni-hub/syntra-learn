"use client"

import Link from "next/link"
import { BrainCircuit, BookOpen, BarChart3, Sparkles, Upload, Target, ArrowRight, Menu, X, CheckCircle, Zap, Shield, Layers, GraduationCap, LineChart, Bot } from "lucide-react"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useState } from "react"

const features = [
  {
    icon: Upload,
    title: "Upload & Process",
    description: "Upload PDFs and documents. AI automatically extracts, structures, and chunks your material into organized learning modules.",
  },
  {
    icon: Bot,
    title: "AI Quiz Generation",
    description: "Generate intelligent quizzes from your content. Multiple formats, adaptive difficulty, and instant feedback.",
  },
  {
    icon: LineChart,
    title: "Deep Analytics",
    description: "Track understanding scores, retention rates, and topic mastery with rich visualizations over time.",
  },
  {
    icon: Target,
    title: "Smart Review",
    description: "Identify weak areas with data-driven insights. Get personalized recommendations for targeted practice.",
  },
  {
    icon: GraduationCap,
    title: "Flashcard Mode",
    description: "Reinforce knowledge with AI-generated flashcards using spaced repetition for optimal retention.",
  },
  {
    icon: Layers,
    title: "Multi-Subject",
    description: "Organize modules by subject, switch between topics seamlessly, and manage your entire curriculum.",
  },
]

const steps = [
  { icon: Upload, title: "Upload", description: "Drop your PDFs and study materials. We support documents of any length and subject." },
  { icon: Bot, title: "Process", description: "AI analyzes content, extracts key concepts, and builds structured learning modules." },
  { icon: BookOpen, title: "Practice", description: "Take AI-generated quizzes, review flashcards, and track your performance in real time." },
  { icon: BarChart3, title: "Master", description: "Monitor progress, identify gaps, and solidify understanding with targeted review." },
]

const stats = [
  { value: "10K+", label: "Quizzes Generated" },
  { value: "5K+", label: "Active Learners" },
  { value: "50+", label: "Subjects" },
  { value: "92%", label: "Satisfaction" },
]

const testimonials = [
  { quote: "LearnHealth transformed how I study for exams. The AI-generated quizzes are incredibly relevant to my course material.", author: "Alex M.", role: "Medical Student" },
  { quote: "The analytics helped me identify exactly which topics I was struggling with. My grades improved significantly.", author: "Sarah K.", role: "Computer Science" },
  { quote: "I love how easy it is to upload my lecture notes and get instant practice questions. A game changer for busy students.", author: "James R.", role: "Engineering" },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <BrainCircuit className="size-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">LearnHealth</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
            <Link href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</Link>
            <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-all hover:bg-muted">Sign In</Link>
            <Link href="/register" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 shadow-sm">Sign Up</Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 -mr-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t bg-background md:hidden">
            <div className="space-y-1 px-4 py-4">
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Features</Link>
              <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">How It Works</Link>
              <Link href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Testimonials</Link>
              <Link href="/docs" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Docs</Link>
              <hr className="my-3" />
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Sign In</Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Sign Up</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
            <div className="relative mx-auto max-w-3xl text-center">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium">
                <Sparkles className="size-3.5 text-primary" />
                AI-Powered Learning Analytics Platform
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Learn Smarter with{" "}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">AI-Driven Insights</span>
              </h1>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed max-w-xl mx-auto">
                Upload your materials, generate intelligent quizzes, and track your understanding over time. LearnHealth adapts to your pace.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 shadow-sm">
                  Get Started Free
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="#features" className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 text-sm font-medium text-foreground transition-all hover:bg-muted">
                  <Zap className="size-4" />
                  See Features
                </Link>
              </div>
            </div>

            <div className="relative mt-20 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border bg-card/50 p-5 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold tracking-tight sm:text-3xl">{stat.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
                <Zap className="size-3 text-primary" />
                Features
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything You Need to Excel</h2>
              <p className="mt-4 text-base text-muted-foreground">
                AI-powered tools designed to turn your study materials into an adaptive, personalized learning experience.
              </p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="relative bg-card p-6 sm:p-8">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-lg border bg-background">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From Zero to Mastery</h2>
              <p className="mt-4 text-base text-muted-foreground">
                Four simple steps to transform how you learn and retain information.
              </p>
            </div>
            <div className="relative mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="relative">
                    {index < steps.length - 1 && (
                      <div className="absolute left-10 top-10 hidden h-px w-[calc(100%-5rem)] border-t border-dashed lg:block" />
                    )}
                    <div className="relative flex flex-col items-center text-center">
                      <div className="flex size-20 items-center justify-center rounded-2xl border bg-card shadow-sm">
                        <Icon className="size-8 text-primary" />
                      </div>
                      <div className="mt-5 inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </div>
                      <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground max-w-xs">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="testimonials" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
                <GraduationCap className="size-3 text-primary" />
                Testimonials
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Trusted by Learners</h2>
              <p className="mt-4 text-base text-muted-foreground">
                See how students and professionals are using LearnHealth to accelerate their learning.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.author} className="rounded-xl border bg-card p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="size-4 fill-primary" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</blockquote>
                  <div className="mt-4 border-t pt-4">
                    <div className="text-sm font-medium">{t.author}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-14 text-center sm:px-16 sm:py-20">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
              <div className="relative mx-auto max-w-xl">
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary shadow-sm">
                  <BrainCircuit className="size-6 text-primary-foreground" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to Learn Smarter?</h2>
                <p className="mt-4 text-base text-muted-foreground">
                  Join thousands of learners transforming their education with AI-powered insights and personalized analytics.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/register" className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 shadow-sm">
                    Get Started Free
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/docs" className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 text-sm font-medium text-foreground transition-all hover:bg-muted">
                    Read Documentation
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                  <BrainCircuit className="size-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold tracking-tight">LearnHealth</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                AI-powered learning analytics platform that helps students and professionals master new subjects faster through intelligent practice and data-driven insights.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                <li><Link href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Resources</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Getting Started</Link></li>
                <li><Link href="/docs#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition-colors">API Reference</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><span className="hover:text-foreground transition-colors cursor-pointer">About</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} LearnHealth. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-foreground transition-colors cursor-pointer">Privacy</span>
              <span className="hover:text-foreground transition-colors cursor-pointer">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
