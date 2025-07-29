'use client'

import { toast } from "sonner"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function ToastExamples() {
  const [isLoading, setIsLoading] = useState(false)

  // Client Management Examples
  const handleAddClient = async () => {
    const loadingToast = toast.loading("Adding new client...")
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.dismiss(loadingToast)
      toast.success("Client Added", {
        description: "New client has been added to your roster"
      })
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error("Failed to Add Client", {
        description: "Please check your internet connection and try again"
      })
    }
  }

  const handleCheckIn = async () => {
    const loadingToast = toast.loading("Checking in client...")
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast.dismiss(loadingToast)
      toast.success("Check-in Successful", {
        description: "Client has been checked in for today's session",
        action: {
          label: "View Session",
          onClick: () => console.log("Navigate to session details")
        }
      })
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error("Check-in Failed", {
        description: "Client has no remaining sessions in their package"
      })
    }
  }

  const handlePackagePurchase = async () => {
    const loadingToast = toast.loading("Processing payment...")
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      toast.dismiss(loadingToast)
      toast.success("Payment Successful", {
        description: "Package has been purchased and sessions added"
      })
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error("Payment Failed", {
        description: "Please check your payment method and try again",
        action: {
          label: "Retry Payment",
          onClick: () => handlePackagePurchase()
        }
      })
    }
  }

  const handleQRScan = () => {
    toast.info("QR Scanner Active", {
      description: "Point your camera at the client's QR code"
    })
  }

  const handleSessionComplete = () => {
    toast.success("Session Completed", {
      description: "Session has been marked as complete and recorded"
    })
  }

  const handleLowSessions = () => {
    toast.warning("Low Sessions Remaining", {
      description: "Client has only 2 sessions left in their package"
    })
  }

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-xl font-bold">Toast Notification Examples</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={handleAddClient} variant="outline">
          Add Client (Success)
        </Button>
        
        <Button onClick={handleCheckIn} variant="outline">
          Check In Client (Success)
        </Button>
        
        <Button onClick={handlePackagePurchase} variant="outline">
          Purchase Package (Loading → Success)
        </Button>
        
        <Button onClick={handleQRScan} variant="outline">
          QR Scan (Info)
        </Button>
        
        <Button onClick={handleSessionComplete} variant="outline">
          Complete Session (Success)
        </Button>
        
        <Button onClick={handleLowSessions} variant="outline">
          Low Sessions (Warning)
        </Button>
      </div>
    </div>
  )
} 