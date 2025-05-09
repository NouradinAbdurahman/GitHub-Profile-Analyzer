"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { getNotifications, markNotificationAsRead } from "@/lib/firebase"
import { Bell } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  message: string
  timestamp: any
  read: boolean
  profileUsername?: string
}

export function NotificationsPopover() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user?.login) return

    // Set up real-time notifications listener
    const unsubscribe = getNotifications(user.login, (notifs) => {
      setNotifications(notifs)
      setUnreadCount(notifs.length)
    })

    return () => {
      unsubscribe()
    }
  }, [user?.login])

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.login) return
    
    await markNotificationAsRead(user.login, notificationId)
    
    // Update local state
    setNotifications(notifications.map(n => 
      n.id === notificationId ? {...n, read: true} : n
    ))
    setUnreadCount(Math.max(0, unreadCount - 1))
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now'

    try {
      const date = timestamp.toDate()
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      
      return date.toLocaleDateString()
    } catch (e) {
      return 'Recently'
    }
  }

  const getNotificationUrl = (notification: Notification) => {
    if (notification.type === 'profile_update' && notification.profileUsername) {
      return `/profile/${notification.profileUsername}`
    }
    return '#'
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[400px] overflow-y-auto p-0">
        <div className="p-4 font-medium">Notifications</div>
        <Separator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No new notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="p-4 hover:bg-muted transition-colors"
            >
              <div className="flex justify-between items-start mb-1">
                <Link 
                  href={getNotificationUrl(notification)}
                  className="text-sm font-medium flex-grow"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  {notification.message}
                </Link>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTimestamp(notification.timestamp)}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-xs hover:bg-transparent text-muted-foreground hover:text-primary p-0"
                onClick={() => handleMarkAsRead(notification.id)}
              >
                Mark as read
              </Button>
            </div>
          ))
        )}
        
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 flex justify-center">
              <Link
                href="/notifications"
                className="text-xs text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
} 