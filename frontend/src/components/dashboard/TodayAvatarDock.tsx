// This reserves real page space; the existing portal renders the unchanged sprite here.
export function TodayAvatarDock() {
  return <div className="today-avatar-landing" aria-hidden="true">
    <div data-today-avatar-dock className="today-avatar-dock" />
    <span className="today-avatar-contact" />
  </div>
}
