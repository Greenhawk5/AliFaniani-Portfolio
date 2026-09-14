/**
 * Hash-route → view mapping for the Control Center. Each view receives the
 * shared data context; navigation back to lists flows through `navigate`.
 */

import type { AdminView } from './routes'
import { OverviewView } from './views/OverviewView'
import { ProjectsView } from './views/ProjectsView'
import { ProfileView } from './views/ProfileView'
import { LinksView } from './views/LinksView'
import { MediaView } from './views/MediaView'
import { PublishingView } from './views/PublishingView'
import { SeoView } from './views/SeoView'
import { ActivityView } from './views/ActivityView'
import { IntegrationsView } from './views/IntegrationsView'
import { SettingsView } from './views/SettingsView'
import { NotFoundPanel } from './views/NotFoundPanel'

export function AdminRouterView({
  view,
  param,
  navigate,
}: {
  view: AdminView
  param: string | null
  navigate: (view: AdminView, param?: string) => void
}) {
  switch (view) {
    case 'overview':
      return <OverviewView onNavigate={navigate} />
    case 'projects':
      return <ProjectsView param={param} navigate={navigate} />
    case 'profile':
      return <ProfileView param={param} navigate={navigate} />
    case 'links':
      return <LinksView param={param} navigate={navigate} />
    case 'media':
      return <MediaView />
    case 'publishing':
      return <PublishingView />
    case 'seo':
      return <SeoView />
    case 'activity':
      return <ActivityView />
    case 'integrations':
      return <IntegrationsView />
    case 'settings':
      return <SettingsView />
    default:
      return <NotFoundPanel />
  }
}
