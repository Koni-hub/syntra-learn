"use client"

import Link from "next/link"
import { BrainCircuit, BookOpen, BarChart3, Sparkles, Upload, Target, ArrowRight, Menu, X, Zap, Layers, GraduationCap, LineChart, Bot, Check, XIcon } from "lucide-react"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useState, useRef, useEffect } from "react"
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion"

function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener("mousemove", handler)
    return () => window.removeEventListener("mousemove", handler)
  }, [])
  return pos
}

function useParticles(count: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const darkRef = useRef(false)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let animId: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener("resize", resize)
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }))
    function update() { darkRef.current = document.documentElement.classList.contains("dark") }
    update()
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const fill = darkRef.current ? "oklch(0.7 0.06 265 / 0.35)" : "oklch(0.35 0.08 265 / 0.35)"
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = fill
        ctx.fill()
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            const a = 0.12 * (1 - dist / 120)
            ctx.strokeStyle = darkRef.current ? `oklch(0.7 0.06 265 / ${a})` : `oklch(0.35 0.08 265 / ${a})`
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(animate)
    }
    animate()
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); mo.disconnect() }
  }, [count])
  return canvasRef
}

function Section({ children, className, delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const features = [
  {
    icon: Upload, title: "Upload & Process",
    description: "Upload PDFs and documents. AI automatically extracts, structures, and chunks your material into organized learning modules.",
  },
  {
    icon: Bot, title: "AI Quiz Generation",
    description: "Generate intelligent quizzes from your content. Multiple formats, adaptive difficulty, and instant feedback.",
  },
  {
    icon: LineChart, title: "Deep Analytics",
    description: "Track understanding scores, retention rates, and topic mastery with rich visualizations over time.",
  },
  {
    icon: Target, title: "Smart Review",
    description: "Identify weak areas with data-driven insights. Get personalized recommendations for targeted practice.",
  },
  {
    icon: GraduationCap, title: "Flashcard Mode",
    description: "Reinforce knowledge with AI-generated flashcards using spaced repetition for optimal retention.",
  },
  {
    icon: Layers, title: "Multi-Subject",
    description: "Organize modules by subject, switch between topics seamlessly, and manage your entire curriculum.",
  },
]

const steps = [
  { icon: Upload, title: "Upload", description: "Drop your PDFs and study materials into the platform." },
  { icon: Bot, title: "Process", description: "AI analyzes content and builds structured learning modules." },
  { icon: BookOpen, title: "Practice", description: "Take AI-generated quizzes and review with flashcards." },
  { icon: BarChart3, title: "Master", description: "Track progress and solidify understanding over time." },
]

const stats = [
  { value: "10K+", label: "Quizzes Generated" },
  { value: "5K+", label: "Active Learners" },
  { value: "50+", label: "Subjects" },
  { value: "92%", label: "Satisfaction" },
]

const testimonials = [
  { quote: "Syntra transformed how I study. The AI-generated quizzes are incredibly relevant.", author: "Alex M.", role: "Medical Student" },
  { quote: "The analytics helped me identify exactly which topics I was struggling with.", author: "Sarah K.", role: "Computer Science" },
  { quote: "Uploading lecture notes and getting instant practice questions is a game changer.", author: "James R.", role: "Engineering" },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mouse = useMousePosition()
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, 150])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const particlesCanvas = useParticles(60)
  const [winSize, setWinSize] = useState({ w: 1920, h: 1080 })
  useEffect(() => { setWinSize({ w: window.innerWidth, h: window.innerHeight }) }, [])
  const heroRef = useRef<HTMLDivElement>(null)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Syntra",
        alternateName: "Study Your Notes with Tracking, Review, and Adaptation",
        description: "AI-powered learning platform. Upload materials, generate intelligent quizzes, and track understanding over time.",
        url: "https://syntra-learn.vercel.app",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@type": "Organization", name: "Syntra" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://syntra-learn.vercel.app" },
          { "@type": "ListItem", position: 2, name: "Features", item: "https://syntra-learn.vercel.app/#features" },
          { "@type": "ListItem", position: 3, name: "Documentation", item: "https://syntra-learn.vercel.app/docs" },
        ],
      },
    ],
  }

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <motion.div whileHover={{ rotate: -10, scale: 1.1 }} className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <BrainCircuit className="size-5 text-primary-foreground" />
            </motion.div>
            <span className="text-lg font-bold tracking-tight">Syntra</span>
            <span className="hidden sm:inline text-[10px] leading-tight text-muted-foreground max-w-[140px] ml-2 border-l pl-2">Study Your Notes with Tracking, Review & Adaptation</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
                {["Features", "How It Works", "Testimonials"].map((item) => (
              <Link key={item} href={`#${item.toLowerCase().replace(/\s/g, "-")}`} className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                {item}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-foreground transition-all group-hover:w-full" />
              </Link>
            ))}
            <Link href="/docs" className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
              Docs
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-foreground transition-all group-hover:w-full" />
            </Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-all hover:bg-muted">Sign In</Link>
            <Link href="/register" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 shadow-sm">Sign Up</Link>
          </div>
          <button type="button" className="md:hidden p-2 -mr-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t bg-background md:hidden overflow-hidden">
              <div className="space-y-1 px-4 py-4">
            {["Features", "How It Works", "Testimonials"].map((item) => (
                  <Link key={item} href={`#${item.toLowerCase().replace(/\s/g, "-")}`} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">{item}</Link>
                ))}
                <Link href="/docs" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Docs</Link>
                <hr className="my-3" />
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Sign In</Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Sign Up</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <section ref={heroRef} className="relative min-h-[90vh] flex items-center overflow-hidden">
          <canvas ref={particlesCanvas} className="absolute inset-0 pointer-events-none" />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent pointer-events-none"
            style={{ transform: `translate(${(mouse.x - winSize.w / 2) * 0.02}px, ${(mouse.y - winSize.h / 2) * 0.02}px)` }}
          />
          <div
            className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/5 blur-3xl pointer-events-none"
          />
            <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative w-full mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium">
                <Sparkles className="size-3.5 text-primary" />
                Study Your Notes with Tracking, Review & Adaptation
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl"
              >
                Learn Smarter with{" "}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">AI-Driven Insights</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg max-w-xl mx-auto"
              >
                Syntra — Study Your Notes with Tracking, Review, and Adaptation. Upload materials, generate intelligent quizzes, and track your understanding over time.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link href="/register" className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 shadow-sm">
                    Get Started Free
                    <ArrowRight className="size-4" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link href="#features" className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 text-sm font-medium text-foreground transition-all hover:bg-muted">
                    <Zap className="size-4" />
                    See Features
                  </Link>
                </motion.div>
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="relative mt-20 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
                  whileHover={{ y: -4, boxShadow: "0 8px 30px hsl(var(--primary) / 0.1)" }}
                  className="rounded-xl border bg-card/50 p-5 text-center backdrop-blur-sm transition-all"
                >
                  <div className="text-2xl font-bold tracking-tight sm:text-3xl">{stat.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

        </section>

        <Section id="features" className="border-t py-20 sm:py-28 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/3 via-transparent to-transparent pointer-events-none" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
            <FadeIn>
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
            </FadeIn>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <motion.div key={feature.title} variants={itemVariants}>
                    <div className="relative rounded-xl border bg-card p-6 sm:p-8 h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                      <motion.div
                        whileHover={{ scale: 1.15 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 flex size-10 items-center justify-center rounded-lg border bg-background"
                      >
                        <Icon className="size-5 text-primary" />
                      </motion.div>
                      <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </Section>

        <Section id="product" className="border-t py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent pointer-events-none" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
                  <Layers className="size-3 text-primary" />
                  Product Preview
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">See Syntra in Action</h2>
                <p className="mt-4 text-base text-muted-foreground">
                  A clean, intuitive interface designed for focused learning.
                </p>
              </div>
            </FadeIn>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              <FadeIn>
                <div className="rounded-xl border bg-card p-1 shadow-lg overflow-hidden">
                  <div className="rounded-t-lg bg-muted/50 px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 rounded-full bg-red-400" />
                      <div className="size-2.5 rounded-full bg-yellow-400" />
                      <div className="size-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-2">Dashboard</span>
                  </div>
                  <div className="bg-background p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border p-3 text-center">
                        <div className="mx-auto size-12 rounded-full border-4 border-primary/30 border-t-primary flex items-center justify-center text-sm font-bold">72%</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">Understanding</div>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <div className="mx-auto size-12 rounded-full border-4 border-green-500/30 border-t-green-500 flex items-center justify-center text-sm font-bold">85%</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">Retention</div>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <div className="text-2xl font-bold text-amber-500">7</div>
                        <div className="text-[10px] text-muted-foreground">Day Streak</div>
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs font-medium mb-2">Recent Activity</div>
                      <div className="space-y-1.5">
                        {["Cell Biology Quiz — 90%", "History Review — 75%", "CSA Practice — 85%"].map((item) => (
                          <div key={item} className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">{item.split(" — ")[0]}</span>
                            <span className="font-medium">{item.split(" — ")[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn>
                <div className="rounded-xl border bg-card p-1 shadow-lg overflow-hidden">
                  <div className="rounded-t-lg bg-muted/50 px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 rounded-full bg-red-400" />
                      <div className="size-2.5 rounded-full bg-yellow-400" />
                      <div className="size-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-2">Quiz Interface</span>
                  </div>
                  <div className="bg-background p-6 space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Question 3 of 10</div>
                      <div className="text-sm font-medium">What is the primary function of mitochondria in cells?</div>
                    </div>
                    <div className="space-y-2">
                      {["A. Protein synthesis", "B. Energy production (ATP)", "C. Cell division", "D. DNA replication"].map((opt, i) => (
                        <div key={opt} className={`rounded-lg border p-2.5 text-xs flex items-center gap-2 ${i === 1 ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
                          <div className={`size-5 shrink-0 rounded-full border-2 flex items-center justify-center text-[10px] font-medium ${i === 1 ? "border-green-500 bg-green-500 text-white" : ""}`}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          {opt.substring(3)}
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-[11px] text-green-700 dark:text-green-400">
                      <strong>Correct!</strong> Mitochondria are known as the powerhouse of the cell, generating most of the cell&apos;s supply of ATP.
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <FadeIn>
                <div className="rounded-xl border bg-card p-1 shadow-lg overflow-hidden">
                  <div className="rounded-t-lg bg-muted/50 px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 rounded-full bg-red-400" />
                      <div className="size-2.5 rounded-full bg-yellow-400" />
                      <div className="size-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-2">Flashcards</span>
                  </div>
                  <div className="bg-background p-6">
                    <div className="rounded-xl border bg-card p-8 text-center min-h-[180px] flex flex-col items-center justify-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Question</div>
                      <div className="text-sm font-medium">What is the powerhouse of the cell?</div>
                      <div className="mt-4 text-[10px] text-muted-foreground">Tap to reveal answer</div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                      <span>Swipe left = Forgot</span>
                      <span className="mx-1">|</span>
                      <span>Swipe right = Good</span>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn>
                <div className="rounded-xl border bg-card p-1 shadow-lg overflow-hidden">
                  <div className="rounded-t-lg bg-muted/50 px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 rounded-full bg-red-400" />
                      <div className="size-2.5 rounded-full bg-yellow-400" />
                      <div className="size-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-2">Analytics</span>
                  </div>
                  <div className="bg-background p-6 space-y-3">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-medium">Topic Mastery</span>
                        <span className="text-muted-foreground">Last 30 days</span>
                      </div>
                      <div className="space-y-2">
                        {[{ topic: "Cell Biology", score: 92 }, { topic: "Genetics", score: 78 }, { topic: "Ecology", score: 65 }].map((t) => (
                          <div key={t.topic}>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="text-muted-foreground">{t.topic}</span>
                              <span className="font-medium">{t.score}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${t.score}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-lg font-bold">24</div>
                        <div className="text-[10px] text-muted-foreground">Quizzes Taken</div>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-lg font-bold">156</div>
                        <div className="text-[10px] text-muted-foreground">Questions Answered</div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </Section>

        <Section id="how-it-works" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From Zero to Mastery</h2>
                <p className="mt-4 text-base text-muted-foreground">
                  Four simple steps to transform how you learn and retain information.
                </p>
              </div>
            </FadeIn>
            <div className="relative mt-16">
              <div className="hidden lg:flex items-start justify-between gap-0">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15, duration: 0.5 }}
                      className="relative flex flex-col items-center text-center flex-1 px-2"
                    >
                      <div className="relative z-10 flex size-16 items-center justify-center rounded-full border-2 border-primary/30 bg-background shadow-sm">
                        <span className="text-lg font-bold text-primary">{index + 1}</span>
                      </div>
                      {index < steps.length - 1 && (
                        <div className="absolute top-8 left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] h-px">
                          <motion.div
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15 + 0.25, duration: 0.4, ease: "easeInOut" }}
                            className="h-full w-full origin-left border-t border-dashed border-muted-foreground/30"
                          />
                        </div>
                      )}
                      <div className="mt-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="size-6 text-primary" />
                      </div>
                      <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground max-w-[180px]">{step.description}</p>
                    </motion.div>
                  )
                })}
              </div>

              <div className="lg:hidden space-y-6">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.4 }}
                      className="relative flex items-start gap-4 pl-0"
                    >
                      {index < steps.length - 1 && (
                        <div className="absolute left-[15px] top-10 bottom-0 w-px border-l border-dashed border-muted-foreground/30" />
                      )}
                      <div className="relative z-10 flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-background">
                        <span className="text-xs font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border bg-card p-4 flex-1">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="size-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{step.title}</h3>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </Section>

        <Section id="testimonials" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
                  <GraduationCap className="size-3 text-primary" />
                  Testimonials
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Trusted by Learners</h2>
                <p className="mt-4 text-base text-muted-foreground">
                  See how students and professionals are using Syntra to accelerate their learning.
                </p>
              </div>
            </FadeIn>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-14 grid gap-6 sm:grid-cols-3"
            >
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.author}
                  variants={itemVariants}
                  whileHover={{ y: -6 }}
                  className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                    className="flex gap-1 mb-4"
                  >
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="size-4 fill-primary" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </motion.div>
                  <blockquote className="text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</blockquote>
                  <div className="mt-4 border-t pt-4">
                    <div className="text-sm font-medium">{t.author}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Section>

        <Section id="comparison" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
                  <BarChart3 className="size-3 text-primary" />
                  Comparison
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why Syntra?</h2>
                <p className="mt-4 text-base text-muted-foreground">
                  See how we compare to other learning platforms across the features that matter most.
                </p>
              </div>
            </FadeIn>
            <div className="mt-14 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 pr-4 font-semibold text-foreground">Feature</th>
                    <th className="py-3 px-4 font-semibold text-primary">Syntra</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">NotebookLM</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">StudyFetch</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Quizlet</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Knowt</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "AI quiz from uploads", syntra: true, nlm: false, sf: true, qz: false, kt: true },
                    { feature: "Deep learning analytics", syntra: true, nlm: false, sf: true, qz: false, kt: false },
                    { feature: "Topic mastery breakdown", syntra: true, nlm: false, sf: false, qz: false, kt: false },
                    { feature: "Spaced repetition", syntra: true, nlm: false, sf: true, qz: true, kt: true },
                    { feature: "Multiple question formats", syntra: true, nlm: true, sf: true, qz: true, kt: true },
                    { feature: "Progress over time", syntra: true, nlm: false, sf: false, qz: true, kt: true },
                    { feature: "Upload your own materials", syntra: true, nlm: true, sf: true, qz: false, kt: false },
                    { feature: "Free tier available", syntra: true, nlm: true, sf: false, qz: true, kt: true },
                    { feature: "Adaptive difficulty", syntra: true, nlm: false, sf: false, qz: false, kt: false },
                    { feature: "Flashcard review", syntra: true, nlm: true, sf: true, qz: true, kt: true },
                  ].map((row, i) => (
                    <motion.tr
                      key={row.feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap">{row.feature}</td>
                      <td className="py-3 px-4"><Check className="size-4 text-primary" /></td>
                      <td className="py-3 px-4">{row.nlm ? <Check className="size-4 text-muted-foreground" /> : <XIcon className="size-4 text-muted-foreground/40" />}</td>
                      <td className="py-3 px-4">{row.sf ? <Check className="size-4 text-muted-foreground" /> : <XIcon className="size-4 text-muted-foreground/40" />}</td>
                      <td className="py-3 px-4">{row.qz ? <Check className="size-4 text-muted-foreground" /> : <XIcon className="size-4 text-muted-foreground/40" />}</td>
                      <td className="py-3 px-4">{row.kt ? <Check className="size-4 text-muted-foreground" /> : <XIcon className="size-4 text-muted-foreground/40" />}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-8 text-center text-xs text-muted-foreground"
            >
              Feature availability based on free tiers as of June 2026. Syntra features subject to change.
            </motion.p>
          </div>
        </Section>

        <Section className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative overflow-hidden rounded-2xl border bg-card px-6 py-14 text-center sm:px-16 sm:py-20"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
              <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary/5 blur-3xl" />
              <div className="relative mx-auto max-w-xl">
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary shadow-sm mx-auto">
                  <BrainCircuit className="size-6 text-primary-foreground" />
                </motion.div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to Learn Smarter?</h2>
                <p className="mt-4 text-base text-muted-foreground">
                  Join thousands of learners transforming their education with AI-powered insights and personalized analytics.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <Link href="/register" className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 shadow-sm">
                      Get Started Free
                      <ArrowRight className="size-4" />
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <Link href="/docs" className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 text-sm font-medium text-foreground transition-all hover:bg-muted">
                      Read Documentation
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </Section>
      </main>

      <footer className="border-t py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                  <BrainCircuit className="size-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold tracking-tight">Syntra</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Syntra — Study Your Notes with Tracking, Review, and Adaptation. An AI-powered learning analytics platform that helps students and professionals master new subjects faster through intelligent practice and data-driven insights.
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
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Syntra. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
