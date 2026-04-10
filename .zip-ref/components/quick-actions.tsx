"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  ArrowUpRight, 
  Clock, 
  UserPlus,
  Wallet,
  Gift
} from "lucide-react"

const actions = [
  {
    label: "Add Funds",
    description: "Deposit money to any goal",
    icon: Plus,
    variant: "default" as const,
  },
  {
    label: "New Child",
    description: "Add another child profile",
    icon: UserPlus,
    variant: "outline" as const,
  },
  {
    label: "Withdraw",
    description: "Access unlocked funds",
    icon: ArrowUpRight,
    variant: "outline" as const,
  },
  {
    label: "Auto-Save",
    description: "Set up recurring deposits",
    icon: Clock,
    variant: "outline" as const,
  },
  {
    label: "Link Bank",
    description: "Connect your bank account",
    icon: Wallet,
    variant: "outline" as const,
  },
  {
    label: "Gift Funds",
    description: "Let family contribute",
    icon: Gift,
    variant: "outline" as const,
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="h-auto flex-col items-start gap-1 p-4 text-left"
          >
            <div className="flex w-full items-center gap-2">
              <action.icon className="h-4 w-4" />
              <span className="font-medium">{action.label}</span>
            </div>
            <span className={`text-xs ${
              action.variant === "default" 
                ? "text-primary-foreground/70" 
                : "text-muted-foreground"
            }`}>
              {action.description}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
