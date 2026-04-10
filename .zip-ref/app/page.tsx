import { Header } from "@/components/header"
import { StatsOverview } from "@/components/stats-overview"
import { ChildCard } from "@/components/child-card"
import { GrowthChart } from "@/components/growth-chart"
import { UpcomingMilestones } from "@/components/upcoming-milestones"
import { QuickActions } from "@/components/quick-actions"

const children = [
  {
    name: "Emma",
    age: 17,
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=emma",
    totalSaved: 20500,
    goals: [
      {
        name: "College Fund",
        current: 15000,
        target: 50000,
        locked: true,
        unlockDate: "Sep 2028",
      },
      {
        name: "18th Birthday",
        current: 5500,
        target: 5000,
        locked: true,
        unlockDate: "Aug 2026",
      },
    ],
  },
  {
    name: "Liam",
    age: 14,
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=liam",
    totalSaved: 14750,
    goals: [
      {
        name: "First Car",
        current: 6250,
        target: 12000,
        locked: true,
        unlockDate: "Dec 2027",
      },
      {
        name: "Summer Camp",
        current: 2500,
        target: 3000,
        locked: false,
        unlockDate: "Jun 2026",
      },
      {
        name: "College Fund",
        current: 6000,
        target: 40000,
        locked: true,
        unlockDate: "Sep 2030",
      },
    ],
  },
  {
    name: "Sophia",
    age: 8,
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=sophia",
    totalSaved: 12000,
    goals: [
      {
        name: "Education Fund",
        current: 8000,
        target: 30000,
        locked: true,
        unlockDate: "Sep 2036",
      },
      {
        name: "Future Home",
        current: 4000,
        target: 25000,
        locked: true,
        unlockDate: "Jun 2035",
      },
    ],
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Good morning, James
            </h1>
            <p className="mt-1 text-muted-foreground">
              Your children&apos;s futures are growing stronger every day
            </p>
          </div>

          {/* Stats Overview */}
          <StatsOverview />

          {/* Main Grid */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Chart & Milestones */}
            <div className="space-y-8 lg:col-span-2">
              <GrowthChart />
              
              {/* Children Cards */}
              <div>
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  Your Children
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {children.map((child) => (
                    <ChildCard key={child.name} {...child} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Actions & Milestones */}
            <div className="space-y-8">
              <QuickActions />
              <UpcomingMilestones />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
