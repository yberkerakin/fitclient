// Service Worker for Fitness SaaS App
const CACHE_NAME = 'fitness-saas-v1'
const OFFLINE_URL = '/offline'

// Files to cache for offline functionality
const CACHE_FILES = [
  '/',
  '/offline',
  '/t/',
  '/trainer-checkin/',
  '/static/css/',
  '/static/js/'
]

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching essential files...')
        return cache.addAll(CACHE_FILES)
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Handle redirect pages specifically
  if (url.pathname.startsWith('/t/')) {
    console.log('🔄 Handling redirect request:', url.pathname)
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the redirect page for offline use
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone)
              })
          }
          return response
        })
        .catch(() => {
          // Return cached version if available
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('📦 Serving cached redirect page')
                return cachedResponse
              }
              
              // Return offline page if no cache
              console.log('📱 Returning offline page')
              return caches.match(OFFLINE_URL)
            })
        })
    )
    return
  }
  
  // Handle trainer-checkin pages
  if (url.pathname.startsWith('/trainer-checkin/')) {
    console.log('🏋️ Handling trainer check-in request:', url.pathname)
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the check-in page
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone)
              })
          }
          return response
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('📦 Serving cached check-in page')
                return cachedResponse
              }
              return caches.match(OFFLINE_URL)
            })
        })
    )
    return
  }
  
  // Handle static assets
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone()
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone)
                  })
              }
              return response
            })
        })
    )
    return
  }
  
  // Default network-first strategy for other requests
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            return caches.match(OFFLINE_URL)
          })
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'check-in-sync') {
    event.waitUntil(
      // Handle offline check-ins when connection is restored
      console.log('📱 Processing offline check-ins...')
    )
  }
})

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : 'Yeni bildirim',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('FitClient', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked')
  
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
}) 