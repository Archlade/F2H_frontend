import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import MobileBottomNav from '../components/MobileBottomNav'

/*
 * The shell's height lives in index.css under `.main-layout-root`, not in an
 * inline style here.
 *
 * It has to be `100dvh` on iOS, and on mobile it also has to subtract the
 * bottom-nav clearance that `body` adds — otherwise the two sum to more than
 * the screen and every short page (an empty cart, a 404) scrolls by an inch
 * for no reason. Neither is expressible as a single inline value, and an
 * inline style would beat the media query that does it.
 */
export default function MainLayout() {
  return (
    <div className="main-layout-root">
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
