import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from './App'

describe('Coordinate Input Formatting', () => {
  it('should format coordinates on blur: 37d25\'N 122d5\'W -> 37° 25′ 0.000″ N 122° 5′ 0.000″ W', () => {
    render(<App />)
    
    // Find the Degrees Minutes Seconds input field
    const dmsInput = screen.getByRole('textbox', { 
      name: /degrees minutes seconds/i 
    })
    
    // Type the shorthand notation
    fireEvent.change(dmsInput, { 
      target: { value: '37d25\'N 122d5\'W' } 
    })
    
    // Verify the input shows the typed value
    expect(dmsInput).toHaveValue('37d25\'N 122d5\'W')
    
    // Trigger blur event (losing focus)
    fireEvent.blur(dmsInput)
    
    // Verify the input is automatically formatted to proper symbols
    expect(dmsInput).toHaveValue('37° 25′ 0.000″ N 122° 5′ 0.000″ W')
  })
  
  it('should not format invalid coordinates on blur', () => {
    render(<App />)
    
    const dmsInput = screen.getByRole('textbox', { 
      name: /degrees minutes seconds/i 
    })
    
    // Type invalid input
    fireEvent.change(dmsInput, { 
      target: { value: 'invalid input' } 
    })
    
    // Trigger blur event
    fireEvent.blur(dmsInput)
    
    // Verify the invalid input remains unchanged
    expect(dmsInput).toHaveValue('invalid input')
  })
})