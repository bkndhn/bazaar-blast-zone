export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          location_link: string | null
          phone: string
          postal_code: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          location_link?: string | null
          phone: string
          postal_code: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          location_link?: string | null
          phone?: string
          postal_code?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_accounts: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["admin_status"]
          store_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["admin_status"]
          store_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["admin_status"]
          store_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          admin_id: string
          cod_enabled: boolean | null
          created_at: string
          cutting_charges: number | null
          delivery_outside_tamilnadu_days: number | null
          delivery_slots: Json | null
          delivery_within_tamilnadu_days: number | null
          extra_delivery_charges: number | null
          free_delivery_above: number | null
          id: string
          is_payment_enabled: boolean | null
          is_shipping_integration_enabled: boolean | null
          online_payment_enabled: boolean | null
          payment_required_before_ship: boolean | null
          phonepe_enabled: boolean | null
          phonepe_merchant_id: string | null
          phonepe_salt_index: string | null
          phonepe_salt_key: string | null
          razorpay_key_id: string | null
          razorpay_key_secret: string | null
          same_day_cutoff_time: string | null
          same_day_delivery_charge: number | null
          same_day_delivery_enabled: boolean | null
          self_pickup_enabled: boolean | null
          service_area_enabled: boolean | null
          service_area_lat: number | null
          service_area_lng: number | null
          service_area_radius_km: number | null
          shipping_cost_outside_tamilnadu: number | null
          shipping_cost_within_tamilnadu: number | null
          shiprocket_email: string | null
          shiprocket_password: string | null
          shop_type: string | null
          terms_conditions: string | null
          theme_color_hsl: string | null
          ticket_window_days: number | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          cod_enabled?: boolean | null
          created_at?: string
          cutting_charges?: number | null
          delivery_outside_tamilnadu_days?: number | null
          delivery_slots?: Json | null
          delivery_within_tamilnadu_days?: number | null
          extra_delivery_charges?: number | null
          free_delivery_above?: number | null
          id?: string
          is_payment_enabled?: boolean | null
          is_shipping_integration_enabled?: boolean | null
          online_payment_enabled?: boolean | null
          payment_required_before_ship?: boolean | null
          phonepe_enabled?: boolean | null
          phonepe_merchant_id?: string | null
          phonepe_salt_index?: string | null
          phonepe_salt_key?: string | null
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          same_day_cutoff_time?: string | null
          same_day_delivery_charge?: number | null
          same_day_delivery_enabled?: boolean | null
          self_pickup_enabled?: boolean | null
          service_area_enabled?: boolean | null
          service_area_lat?: number | null
          service_area_lng?: number | null
          service_area_radius_km?: number | null
          shipping_cost_outside_tamilnadu?: number | null
          shipping_cost_within_tamilnadu?: number | null
          shiprocket_email?: string | null
          shiprocket_password?: string | null
          shop_type?: string | null
          terms_conditions?: string | null
          theme_color_hsl?: string | null
          ticket_window_days?: number | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          cod_enabled?: boolean | null
          created_at?: string
          cutting_charges?: number | null
          delivery_outside_tamilnadu_days?: number | null
          delivery_slots?: Json | null
          delivery_within_tamilnadu_days?: number | null
          extra_delivery_charges?: number | null
          free_delivery_above?: number | null
          id?: string
          is_payment_enabled?: boolean | null
          is_shipping_integration_enabled?: boolean | null
          online_payment_enabled?: boolean | null
          payment_required_before_ship?: boolean | null
          phonepe_enabled?: boolean | null
          phonepe_merchant_id?: string | null
          phonepe_salt_index?: string | null
          phonepe_salt_key?: string | null
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          same_day_cutoff_time?: string | null
          same_day_delivery_charge?: number | null
          same_day_delivery_enabled?: boolean | null
          self_pickup_enabled?: boolean | null
          service_area_enabled?: boolean | null
          service_area_lat?: number | null
          service_area_lng?: number | null
          service_area_radius_km?: number | null
          shipping_cost_outside_tamilnadu?: number | null
          shipping_cost_within_tamilnadu?: number | null
          shiprocket_email?: string | null
          shiprocket_password?: string | null
          shop_type?: string | null
          terms_conditions?: string | null
          theme_color_hsl?: string | null
          ticket_window_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_support_settings: {
        Row: {
          admin_id: string
          chat_enabled: boolean | null
          chat_url: string | null
          created_at: string | null
          email_address: string | null
          email_enabled: boolean | null
          id: string
          phone_enabled: boolean | null
          phone_number: string | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          admin_id: string
          chat_enabled?: boolean | null
          chat_url?: string | null
          created_at?: string | null
          email_address?: string | null
          email_enabled?: boolean | null
          id?: string
          phone_enabled?: boolean | null
          phone_number?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          admin_id?: string
          chat_enabled?: boolean | null
          chat_url?: string | null
          created_at?: string | null
          email_address?: string | null
          email_enabled?: boolean | null
          id?: string
          phone_enabled?: boolean | null
          phone_number?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      banner_ads: {
        Row: {
          admin_id: string
          background_color: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          text_color: string | null
          text_content: string | null
          title: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          background_color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          text_color?: string | null
          text_content?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          background_color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          text_color?: string | null
          text_content?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          custom_unit: string | null
          custom_weight: number | null
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_unit?: string | null
          custom_weight?: number | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_unit?: string | null
          custom_weight?: number | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          show_on_home: boolean | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          show_on_home?: boolean | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          show_on_home?: boolean | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_partners: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_tracking: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          order_id: string
          partner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          order_id: string
          partner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          order_id?: string
          partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          admin_id: string
          answer: string
          created_at: string
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_details: {
        Row: {
          admin_id: string
          cost_price: number | null
          created_at: string
          expiry_date: string | null
          id: string
          low_stock_alert_level: number | null
          product_id: string
          purchase_date: string | null
          purchase_supplier: string | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          cost_price?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          low_stock_alert_level?: number | null
          product_id: string
          purchase_date?: string | null
          purchase_supplier?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          cost_price?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          low_stock_alert_level?: number | null
          product_id?: string
          purchase_date?: string | null
          purchase_supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          admin_id: string
          created_at: string
          custom_unit: string | null
          custom_weight: number | null
          id: string
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          admin_id: string
          created_at?: string
          custom_unit?: string | null
          custom_weight?: number | null
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          admin_id?: string
          created_at?: string
          custom_unit?: string | null
          custom_weight?: number | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          admin_id: string
          courier_service: string | null
          courier_tracking_url: string | null
          created_at: string
          delivered_at: string | null
          delivery_partner_id: string | null
          delivery_slot: string | null
          delivery_type: string | null
          estimated_delivery_date: string | null
          id: string
          notes: string | null
          order_number: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          shipped_at: string | null
          shipping_cost: number
          status: string
          store_id: string | null
          subtotal: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_id?: string | null
          admin_id: string
          courier_service?: string | null
          courier_tracking_url?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_partner_id?: string | null
          delivery_slot?: string | null
          delivery_type?: string | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping_cost?: number
          status?: string
          store_id?: string | null
          subtotal: number
          total: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_id?: string | null
          admin_id?: string
          courier_service?: string | null
          courier_tracking_url?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_partner_id?: string | null
          delivery_slot?: string | null
          delivery_type?: string | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping_cost?: number
          status?: string
          store_id?: string | null
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          admin_id: string
          created_at: string | null
          id: string
          is_verified_purchase: boolean | null
          order_id: string | null
          product_id: string
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          order_id?: string | null
          product_id: string
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          order_id?: string | null
          product_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          admin_id: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          extra_notes: string | null
          id: string
          is_active: boolean
          max_quantity: number | null
          min_quantity: number | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number
          storage_instructions: string | null
          store_id: string
          unit_label: string | null
          unit_type: string | null
          unit_value: number | null
          updated_at: string
          usage_instructions: string | null
        }
        Insert: {
          admin_id: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          extra_notes?: string | null
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          min_quantity?: number | null
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number
          storage_instructions?: string | null
          store_id: string
          unit_label?: string | null
          unit_type?: string | null
          unit_value?: number | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Update: {
          admin_id?: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          extra_notes?: string | null
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          min_quantity?: number | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          storage_instructions?: string | null
          store_id?: string
          unit_label?: string | null
          unit_type?: string | null
          unit_value?: number | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_login: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_history: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          product_id: string
          quantity_change: number
          type: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id: string
          quantity_change: number
          type: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string
          quantity_change?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_policies: {
        Row: {
          admin_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          admin_id: string
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_id: string
          created_at: string
          description: string
          id: string
          order_id: string | null
          status: string
          subject: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          status?: string
          subject: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          status?: string
          subject?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_images_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_admin_reply: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      get_user_admin_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      admin_status: "active" | "paused"
      app_role: "super_admin" | "admin" | "user" | "delivery_partner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_status: ["active", "paused"],
      app_role: ["super_admin", "admin", "user", "delivery_partner"],
    },
  },
} as const
