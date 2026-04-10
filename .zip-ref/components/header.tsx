"use client"

import { Bird, Bell, Settings, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Bird className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground">Nest</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="default" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Funds
          </Button>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
              3
            </span>
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            <AvatarImage src="https://api.dicebear.com/7.x/lorelei/svg?seed=dad" alt="User" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
