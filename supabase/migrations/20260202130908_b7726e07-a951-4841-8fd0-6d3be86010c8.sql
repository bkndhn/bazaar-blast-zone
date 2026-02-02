-- Create role enum for the three-tier system
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

-- Create admin status enum
CREATE TYPE public.admin_status AS ENUM ('active', 'paused');

-- Profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles as per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Admin management table (for Super Admin to manage store owners)
CREATE TABLE public.admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  status admin_status NOT NULL DEFAULT 'paused',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stores table (each admin owns one store)
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories table (global categories managed by Super Admin)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products table with admin_id for data isolation
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  sku TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product images table
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer addresses
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shopping cart items
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wishlist
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- Create indexes for performance
CREATE INDEX idx_products_admin_id ON public.products(admin_id);
CREATE INDEX idx_products_store_id ON public.products(store_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_admin_id ON public.orders(admin_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if admin is active
CREATE OR REPLACE FUNCTION public.is_admin_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_accounts
    WHERE user_id = _user_id
      AND status = 'active'
  )
$$;

-- Function to get user's admin_id (for customers linked to stores)
CREATE OR REPLACE FUNCTION public.get_user_admin_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_id FROM public.stores WHERE admin_id = _user_id
  UNION
  SELECT _user_id WHERE public.has_role(_user_id, 'admin')
  LIMIT 1
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_admin_accounts_updated_at BEFORE UPDATE ON public.admin_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Default role is 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- USER ROLES RLS (only super admin can manage)
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- ADMIN ACCOUNTS RLS
CREATE POLICY "Admins can view their own account" ON public.admin_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all admin accounts" ON public.admin_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- STORES RLS
CREATE POLICY "Public can view active stores" ON public.stores FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage their own store" ON public.stores FOR ALL TO authenticated USING (auth.uid() = admin_id AND public.is_admin_active(auth.uid()));
CREATE POLICY "Super admins can manage all stores" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- CATEGORIES RLS (public read, super admin write)
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Super admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- PRODUCTS RLS
CREATE POLICY "Public can view active products from active stores" ON public.products FOR SELECT USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.stores WHERE id = store_id AND is_active = true
  )
);
CREATE POLICY "Admins can manage their own products" ON public.products FOR ALL TO authenticated USING (
  auth.uid() = admin_id AND public.is_admin_active(auth.uid())
);
CREATE POLICY "Super admins can view all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- PRODUCT IMAGES RLS
CREATE POLICY "Public can view product images" ON public.product_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND is_active = true)
);
CREATE POLICY "Admins can manage their product images" ON public.product_images FOR ALL TO authenticated USING (
  auth.uid() = admin_id AND public.is_admin_active(auth.uid())
);

-- ADDRESSES RLS
CREATE POLICY "Users can manage their own addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id);

-- CART ITEMS RLS
CREATE POLICY "Users can manage their own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id);

-- ORDERS RLS
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view orders for their store" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = admin_id);
CREATE POLICY "Admins can update orders for their store" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = admin_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- ORDER ITEMS RLS
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view their order items" ON public.order_items FOR SELECT TO authenticated USING (auth.uid() = admin_id);
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);

-- WISHLIST RLS
CREATE POLICY "Users can manage their wishlist" ON public.wishlist_items FOR ALL TO authenticated USING (auth.uid() = user_id);