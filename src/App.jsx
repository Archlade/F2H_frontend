import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'

// Layouts
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'
import AdminLayout from './layouts/AdminLayout'

// Public pages
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import FarmersPage from './pages/FarmersPage'
import FarmerDetailPage from './pages/FarmerDetailPage'
import AuthPage from './pages/AuthPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HowItWorksPage from './pages/HowItWorksPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import WeeklyBasketPage from './pages/WeeklyBasketPage'

// Customer pages
import CustomerDashboard from './pages/customer/CustomerDashboard'
import CustomerRequests from './pages/customer/CustomerRequests'
import CustomerOrders from './pages/customer/CustomerOrders'
import CustomerFavorites from './pages/customer/CustomerFavorites'
import CustomerProfile from './pages/customer/CustomerProfile'
import CustomerAddresses from './pages/customer/CustomerAddresses'
import CustomerNotifications from './pages/customer/CustomerNotifications'
import CustomerReviews from './pages/customer/CustomerReviews'
import CustomerFamilyPackOrders from './pages/customer/CustomerFamilyPackOrders'
import CustomerFamilyPackBuilder from './pages/customer/CustomerFamilyPackBuilder'

// Farmer pages
import FarmerDashboard from './pages/farmer/FarmerDashboard'
import FarmerProducts from './pages/farmer/FarmerProducts'
import FarmerProductForm from './pages/farmer/FarmerProductForm'
import FarmerRequests from './pages/farmer/FarmerRequests'
import FarmerOrders from './pages/farmer/FarmerOrders'
import FarmerPurchases from './pages/farmer/FarmerPurchases'
import FarmerAnalytics from './pages/farmer/FarmerAnalytics'
import FarmerProfile from './pages/farmer/FarmerProfile'
import FarmerInventory from './pages/farmer/FarmerInventory'
import FarmerNotifications from './pages/farmer/FarmerNotifications'
import FarmerFamilyPackOrders from './pages/farmer/FarmerFamilyPackOrders'
import FarmerSubscriptions from './pages/farmer/FarmerSubscriptions'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminFarmers from './pages/admin/AdminFarmers'
import AdminProducts from './pages/admin/AdminProducts'
import AdminCategories from './pages/admin/AdminCategories'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminRequests from './pages/admin/AdminRequests'
import AdminOrders from './pages/admin/AdminOrders'
import DeleteAccountPage from './pages/DeleteAccountPage'
import CartPage from './pages/CartPage'
import AdminReviews from './pages/admin/AdminReviews'
import AdminReports from './pages/admin/AdminReports'
import AdminFeaturedContent from './pages/admin/AdminFeaturedContent'
import AdminHomepage from './pages/admin/AdminHomepage'
import AdminBanners from './pages/admin/AdminBanners'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'
import AdminReportsData from './pages/admin/AdminReportsData'
import AdminSettings from './pages/admin/AdminSettings'
import AdminDelivery from './pages/admin/AdminDelivery'
import AdminServiceReviews from './pages/admin/AdminServiceReviews'
import DeliveryOrders from './pages/delivery/DeliveryOrders'
import { homeFor } from './utils/roleHome'
import { PASSWORD_RESET_ENABLED } from './config/features'
import AdminAnnouncements from './pages/admin/AdminAnnouncements'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminBaskets from './pages/admin/AdminBaskets'


// Guards
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (!user) return <Navigate to="/auth" replace />
  // Refused roles go to their own home, not to `/`. Sending a delivery account
  // to the public shopfront is how it ended up browsing the marketplace after
  // every blocked route.
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (user) return <Navigate to={homeFor(user.role)} replace />
  return children
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, sans-serif',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />

      <Routes>
        {/* ── Public ── */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/farmers" element={<FarmersPage />} />
          <Route path="/farmers/:id" element={<FarmerDetailPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          {/* The weekly basket's public front door. It used to live on the
              family-packs page; removing family packs took it with it, leaving
              a built feature nobody signed out could find. */}
          <Route path="/weekly-basket" element={<WeeklyBasketPage />} />
          <Route path="/cart" element={<CartPage />} />
          {/* Public deliberately: Play requires a deletion page reachable
              without signing in or having the app installed. */}
          <Route path="/account/delete" element={<DeleteAccountPage />} />
        </Route>

        {/* ── Auth ── */}
        <Route path="/auth" element={<GuestRoute><AuthPage /></GuestRoute>} />
        {/* Hiding the links is not enough on its own: a bookmark or a typed URL
            still reaches the form, which would take an email address and
            promise a message nothing sends. Kept as a route rather than deleted
            so restoring it is one flag. */}
        <Route
          path="/forgot-password"
          element={PASSWORD_RESET_ENABLED
            ? <GuestRoute><ForgotPasswordPage /></GuestRoute>
            : <Navigate to="/auth" replace />}
        />
        {/* Not behind GuestRoute: a signed-in user following a reset link from
            their inbox should still be able to complete it. */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ── Customer ── */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['customer']}>
            <DashboardLayout role="customer" />
          </ProtectedRoute>
        }>
          <Route index element={<CustomerDashboard />} />
          <Route path="requests" element={<CustomerRequests />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="family-pack-orders" element={<CustomerFamilyPackOrders />} />
          <Route path="family-pack/new" element={<CustomerFamilyPackBuilder />} />
          <Route path="family-pack/:id/edit" element={<CustomerFamilyPackBuilder />} />
          <Route path="favorites" element={<CustomerFavorites />} />
          <Route path="notifications" element={<CustomerNotifications />} />
          <Route path="reviews" element={<CustomerReviews />} />
          <Route path="addresses" element={<CustomerAddresses />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>

        {/* ── Farmer ── */}
        <Route path="/farmer" element={
          <ProtectedRoute roles={['farmer']}>
            <DashboardLayout role="farmer" />
          </ProtectedRoute>
        }>
          <Route index element={<FarmerDashboard />} />
          <Route path="products" element={<FarmerProducts />} />
          <Route path="products/new" element={<FarmerProductForm />} />
          <Route path="products/:id/edit" element={<FarmerProductForm />} />
          <Route path="family-pack-orders" element={<FarmerFamilyPackOrders />} />
          {/* Baskets containing this farmer's produce — the supply side. */}
          <Route path="subscriptions" element={<FarmerSubscriptions />} />
          {/* A basket the farmer ordered for their own household — the buy
              side, on the same screens customers use. Farmers eat vegetables
              too, and the API has always allowed this; only the web routes
              didn't.

              `my-basket`, not `family-pack-orders`: that segment is already
              taken above by the supply side. Two routes on one path means React
              Router serves the first and the second is silently dead. */}
          <Route path="my-basket" element={<CustomerFamilyPackOrders />} />
          <Route path="my-basket/new" element={<CustomerFamilyPackBuilder />} />
          <Route path="my-basket/:id/edit" element={<CustomerFamilyPackBuilder />} />
          {/* Delivery addresses. A basket cannot be created without one, and
              farmers had no address screen at all — so a farmer could build a
              basket and have nowhere to send it, with the "add an address" link
              leading to a 404. Their farm address is a different thing: that is
              where produce is collected, not where their shopping goes. */}
          <Route path="addresses" element={<CustomerAddresses />} />
          <Route path="inventory" element={<FarmerInventory />} />
          <Route path="requests" element={<FarmerRequests />} />
          <Route path="orders" element={<FarmerOrders />} />
          {/* What this farmer has bought from other farms, kept apart from
              the selling screens above. */}
          <Route path="purchases" element={<FarmerPurchases />} />
          <Route path="analytics" element={<FarmerAnalytics />} />
          <Route path="profile" element={<FarmerProfile />} />
          <Route path="notifications" element={<FarmerNotifications />} />
        </Route>

        {/* ── Admin ── */}
        {/* The delivery role has one page and no layout. It is not part of
            the customer site and must not be reachable from it. */}
        <Route path="/delivery" element={
          <ProtectedRoute roles={['delivery', 'admin']}>
            <DeliveryOrders />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="farmers" element={<AdminFarmers />} />
          <Route path="products" element={<AdminProducts />} />
          {/* Parity with admin_baskets_screen.dart in the app. */}
          <Route path="baskets" element={<AdminBaskets />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="featured" element={<AdminFeaturedContent />} />
          <Route path="homepage" element={<AdminHomepage />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="insights" element={<AdminReportsData />} />
          <Route path="delivery" element={<AdminDelivery />} />
          <Route path="service-reviews" element={<AdminServiceReviews />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>


        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <style>{`
        .page-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid var(--color-gray-200);
          border-top-color: var(--color-primary-600);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
