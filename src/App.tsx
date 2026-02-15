import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { StoreProvider } from "@/contexts/StoreContext";

// Customer Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Account from "./pages/Account";
import ProfileEdit from "./pages/ProfileEdit";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Category from "./pages/Category";
import Orders from "./pages/Orders";
import Addresses from "./pages/Addresses";
import Checkout from "./pages/Checkout";
import OrderDetail from "./pages/OrderDetail";
import Payments from "./pages/Payments";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SupportTickets from "./pages/SupportTickets";
import StoreFront from "./pages/StoreFront";
import Terms from "./pages/Terms";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminSettings from "./pages/admin/Settings";
import AdminCRM from "./pages/admin/CRM";
import AdminCategories from "./pages/admin/Categories";
import AdminBanners from "./pages/admin/Banners";
import AdminSupport from "./pages/admin/SupportTickets";
import AdminSupportSettings from "./pages/admin/SupportSettings";
import AdminPaymentReports from "./pages/admin/PaymentReports";
import AdminInventory from "./pages/admin/Inventory";
import AdminDeliveryPartners from "./pages/admin/DeliveryPartners";

// Delivery Partner Pages
import DeliveryPartner from "./pages/DeliveryPartner";

// Super Admin Pages
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminAdmins from "./pages/super-admin/Admins";
import SuperAdminUsers from "./pages/super-admin/Users";
// Categories removed from super admin - managed per admin only
import SuperAdminStores from "./pages/super-admin/Stores";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Default Home (shows all products) */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/account" element={<Account />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/category/:slug" element={<Category />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/addresses" element={<Addresses />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order/:id" element={<OrderDetail />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/support" element={<Support />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tickets" element={<SupportTickets />} />
              <Route path="/terms" element={<Terms />} />

              {/* Store-specific routes: /s/store-slug */}
              <Route path="/s/:storeSlug" element={<StoreProvider><StoreFront /></StoreProvider>} />
              <Route path="/s/:storeSlug/products" element={<StoreProvider><Products /></StoreProvider>} />
              <Route path="/s/:storeSlug/product/:id" element={<StoreProvider><ProductDetail /></StoreProvider>} />
              <Route path="/s/:storeSlug/category/:slug" element={<StoreProvider><Category /></StoreProvider>} />
              <Route path="/s/:storeSlug/cart" element={<StoreProvider><Cart /></StoreProvider>} />
              <Route path="/s/:storeSlug/wishlist" element={<StoreProvider><Wishlist /></StoreProvider>} />
              <Route path="/s/:storeSlug/checkout" element={<StoreProvider><Checkout /></StoreProvider>} />
              <Route path="/s/:storeSlug/orders" element={<StoreProvider><Orders /></StoreProvider>} />
              <Route path="/s/:storeSlug/order/:id" element={<StoreProvider><OrderDetail /></StoreProvider>} />
              <Route path="/s/:storeSlug/account" element={<StoreProvider><Account /></StoreProvider>} />
              <Route path="/s/:storeSlug/profile/edit" element={<StoreProvider><ProfileEdit /></StoreProvider>} />
              <Route path="/s/:storeSlug/addresses" element={<StoreProvider><Addresses /></StoreProvider>} />
              <Route path="/s/:storeSlug/payments" element={<StoreProvider><Payments /></StoreProvider>} />
              <Route path="/s/:storeSlug/support" element={<StoreProvider><Support /></StoreProvider>} />
              <Route path="/s/:storeSlug/settings" element={<StoreProvider><Settings /></StoreProvider>} />
              <Route path="/s/:storeSlug/tickets" element={<StoreProvider><SupportTickets /></StoreProvider>} />
              <Route path="/s/:storeSlug/terms" element={<StoreProvider><Terms /></StoreProvider>} />
              <Route path="/s/:storeSlug/auth" element={<StoreProvider><Auth /></StoreProvider>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/banners" element={<AdminBanners />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/crm" element={<AdminCRM />} />
              <Route path="/admin/payment-reports" element={<AdminPaymentReports />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/admin/support-settings" element={<AdminSupportSettings />} />
              <Route path="/admin/inventory" element={<AdminInventory />} />
              <Route path="/admin/delivery-partners" element={<AdminDeliveryPartners />} />

              {/* Delivery Partner Route */}
              <Route path="/delivery" element={<DeliveryPartner />} />

              {/* Super Admin Routes */}
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/admins" element={<SuperAdminAdmins />} />
              <Route path="/super-admin/users" element={<SuperAdminUsers />} />
              {/* Categories removed from super admin */}
              <Route path="/super-admin/stores" element={<SuperAdminStores />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
