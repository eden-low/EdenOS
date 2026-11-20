import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { CosmosSelectionProvider } from './CosmosSelectionProvider'
import { cosmosExperienceIds, createCosmosSelection, useCosmosSelection } from './cosmosSelection'

describe('one shared Cosmos selection', () => {
  it('defaults to Tarot and notifies both consumers exactly once per actual selection', () => {
    const selection = createCosmosSelection(), page = vi.fn(), avatar = vi.fn()
    const stopPage = selection.subscribe(page), stopAvatar = selection.subscribe(avatar)
    expect(selection.getSnapshot()).toBe('tarot')
    for (const system of cosmosExperienceIds.slice(1)) {
      selection.setExperience(system); selection.setExperience(system)
      expect(selection.getSnapshot()).toBe(system)
    }
    expect(page).toHaveBeenCalledTimes(5); expect(avatar).toHaveBeenCalledTimes(5)
    selection.setExperience(previous => previous === 'ai' ? 'tarot' : 'ai')
    expect(selection.getSnapshot()).toBe('tarot')
    stopPage(); stopAvatar(); selection.setExperience('bazi')
    expect(page).toHaveBeenCalledTimes(6); expect(avatar).toHaveBeenCalledTimes(6)
  })
  it('resets a new visit before rendering while tab changes preserve local page state and DOM', () => {
    function Page() {
      const [system, setSystem] = useCosmosSelection(), [value, setValue] = useState('')
      return <><output>{system}</output><input aria-label="local calculation input" value={value} onChange={event => setValue(event.target.value)} /><button onClick={() => setSystem('ziwei')}>Choose Zi Wei</button></>
    }
    const tree = (active: boolean) => <CosmosSelectionProvider active={active}><Page /></CosmosSelectionProvider>
    const view = render(tree(true)), input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'unchanged local draft' } })
    fireEvent.click(screen.getByText('Choose Zi Wei'))
    expect(screen.getByText('ziwei')).toBeTruthy()
    expect(screen.getByRole('textbox')).toBe(input)
    expect((input as HTMLInputElement).value).toBe('unchanged local draft')
    view.rerender(tree(false)); view.rerender(tree(true))
    expect(screen.getByText('tarot')).toBeTruthy()
    expect(screen.getByRole('textbox')).toBe(input)
  })
})
