import { Link } from 'react-router-dom'
import { projects } from '@/data/projects'
import { SITE } from '@/app/config'

/**
 * Semantic fallback layer for the 3D room (/room).
 *
 * The 3D room renders identity, navigation and project information into canvas
 * textures, which carry no meaning for search engines or assistive technology.
 * This layer mirrors that content as visually hidden (sr-only) real HTML, so
 * the room is never a dead end for crawlers, screen-reader users or visitors
 * whose WebGL/JS fails — while keeping the visible room experience clean.
 */
export function RoomContentLayer() {
  return (
    <div className="sr-only absolute inset-0 z-10">
      <h1>{SITE.name} — Interactive 3D Portfolio</h1>
      <p>
        An interactive 3D developer room you can explore: {SITE.name}&apos;s
        workspace with a project showcase board, a live day/night cycle and
        hidden easter eggs.
      </p>
      <nav aria-label="Room navigation">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            <Link to="/projects">Projects</Link>
          </li>
          <li>
            <Link to="/contact">Contact</Link>
          </li>
        </ul>
      </nav>
      <nav aria-label="Room projects">
        <ul>
          {projects.map((project) => (
            <li key={project.slug}>
              <Link to={`/projects/${project.slug}`}>{project.title}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}