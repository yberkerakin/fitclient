'use client'

import { toast } from "sonner"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addClientAction, checkInClientAction, createPackageAction } from "./server-toast-examples"

export function ServerClientIntegration() {
  const [isPending, startTransition] = useTransition()

  const handleAddClient = async (formData: FormData) => {
    const loadingToast = toast.loading("Adding client...")
    
    startTransition(async () => {
      try {
        const result = await addClientAction(formData)
        
        toast.dismiss(loadingToast)
        
        if (result.success) {
          toast.success("Client Added", {
            description: result.message
          })
        } else {
          toast.error("Failed to Add Client", {
            description: result.message
          })
        }
      } catch (error) {
        toast.dismiss(loadingToast)
        toast.error("Unexpected Error", {
          description: "Something went wrong. Please try again."
        })
      }
    })
  }

  const handleCheckIn = async (clientId: string) => {
    const loadingToast = toast.loading("Checking in client...")
    
    startTransition(async () => {
      try {
        const result = await checkInClientAction(clientId)
        
        toast.dismiss(loadingToast)
        
        if (result.success) {
          toast.success("Check-in Successful", {
            description: result.message
          })
        } else {
          toast.error("Check-in Failed", {
            description: result.message
          })
        }
      } catch (error) {
        toast.dismiss(loadingToast)
        toast.error("Unexpected Error", {
          description: "Something went wrong. Please try again."
        })
      }
    })
  }

  const handleCreatePackage = async (formData: FormData) => {
    const loadingToast = toast.loading("Creating package...")
    
    startTransition(async () => {
      try {
        const result = await createPackageAction(formData)
        
        toast.dismiss(loadingToast)
        
        if (result.success) {
          toast.success("Package Created", {
            description: result.message
          })
        } else {
          toast.error("Failed to Create Package", {
            description: result.message
          })
        }
      } catch (error) {
        toast.dismiss(loadingToast)
        toast.error("Unexpected Error", {
          description: "Something went wrong. Please try again."
        })
      }
    })
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-bold">Server Actions with Toast Integration</h2>
      
      {/* Add Client Form */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Add Client</h3>
        <form action={handleAddClient} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add Client"}
          </Button>
        </form>
      </div>

      {/* Check In Button */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Check In Client</h3>
        <Button 
          onClick={() => handleCheckIn("client-123")}
          disabled={isPending}
        >
          {isPending ? "Checking in..." : "Check In Client"}
        </Button>
      </div>

      {/* Create Package Form */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Create Package</h3>
        <form action={handleCreatePackage} className="space-y-4">
          <div>
            <Label htmlFor="package-name">Package Name</Label>
            <Input id="package-name" name="name" required />
          </div>
          <div>
            <Label htmlFor="session-count">Session Count</Label>
            <Input id="session-count" name="session_count" type="number" min="1" required />
          </div>
          <div>
            <Label htmlFor="price">Fiyat (₺)</Label>
            <Input id="price" name="price" type="number" min="0" step="0.01" required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Package"}
          </Button>
        </form>
      </div>
    </div>
  )
} 