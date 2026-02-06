import { supabase } from './supabaseClient'

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const startTime = Date.now()
    
    // Simple health check - try to get session
    const { data, error } = await supabase.auth.getSession()
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    console.log(`Supabase response time: ${responseTime}ms`)
    
    if (error) {
      console.error('Supabase health check failed:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Supabase connection error:', error)
    return false
  }
}

export const retryWithBackoff = async (
  fn: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
}
