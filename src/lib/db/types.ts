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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          changes: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          entity_name: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          amount_base: number | null
          created_at: string
          created_by: string
          currency: string
          description: string | null
          exchange_rate: number | null
          expense_category: string | null
          id: string
          movement_type: string
          reference_id: string | null
          reference_type: string | null
          session_id: string
        }
        Insert: {
          amount: number
          amount_base?: number | null
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          exchange_rate?: number | null
          expense_category?: string | null
          id?: string
          movement_type: string
          reference_id?: string | null
          reference_type?: string | null
          session_id: string
        }
        Update: {
          amount?: number
          amount_base?: number | null
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          exchange_rate?: number | null
          expense_category?: string | null
          id?: string
          movement_type?: string
          reference_id?: string | null
          reference_type?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          register_number: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          register_number: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          register_number?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          actual_amount: number | null
          closed_at: string | null
          closed_by: string | null
          closing_notes: string | null
          created_at: string
          difference: number | null
          expected_amount: number
          id: string
          opened_at: string
          opened_by: string
          opening_amount: number
          register_id: string
          status: string
          total_cash_sales: number
          total_expenses: number
          total_qr_sales: number
          total_sales: number
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_notes?: string | null
          created_at?: string
          difference?: number | null
          expected_amount?: number
          id?: string
          opened_at?: string
          opened_by: string
          opening_amount?: number
          register_id: string
          status?: string
          total_cash_sales?: number
          total_expenses?: number
          total_qr_sales?: number
          total_sales?: number
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_notes?: string | null
          created_at?: string
          difference?: number | null
          expected_amount?: number
          id?: string
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          register_id?: string
          status?: string
          total_cash_sales?: number
          total_expenses?: number
          total_qr_sales?: number
          total_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
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
      clients: {
        Row: {
          address: string | null
          business_name: string | null
          ci: string | null
          city: string | null
          client_type: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          nit: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          web_customer_id: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          ci?: string | null
          city?: string | null
          client_type?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          nit?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          web_customer_id?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          ci?: string | null
          city?: string | null
          client_type?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          nit?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          web_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_web_customer_id_fkey"
            columns: ["web_customer_id"]
            isOneToOne: false
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_payments: {
        Row: {
          amount: number
          cash_session_id: string | null
          client_id: string | null
          created_at: string
          id: string
          payment_method: string
          received_by: string
          sale_id: string
        }
        Insert: {
          amount: number
          cash_session_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          payment_method: string
          received_by: string
          sale_id: string
        }
        Update: {
          amount?: number
          cash_session_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          received_by?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          is_base: boolean
          name: string
          sort_order: number
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          is_base?: boolean
          name: string
          sort_order?: number
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          is_base?: boolean
          name?: string
          sort_order?: number
          symbol?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          effective_date: string
          from_currency: string
          id: string
          rate: number
          to_currency: string
        }
        Insert: {
          created_at?: string
          effective_date?: string
          from_currency: string
          id?: string
          rate: number
          to_currency: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          from_currency?: string
          id?: string
          rate?: number
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_fkey"
            columns: ["from_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_fkey"
            columns: ["to_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit_name: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          unit_name?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_name?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_units: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_base: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_base?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_base?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          alt: string
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          alt?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          updated_at?: string
          url?: string
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
      product_price_tiers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          min_quantity: number
          product_unit_id: string
          sort_order: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          min_quantity: number
          product_unit_id: string
          sort_order?: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          min_quantity?: number
          product_unit_id?: string
          sort_order?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_price_tiers_product_unit_id_fkey"
            columns: ["product_unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      product_units: {
        Row: {
          conversion_factor: number
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          product_id: string
          retail_price: number | null
          unit_id: string
          updated_at: string
          wholesale_price: number | null
        }
        Insert: {
          conversion_factor?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          product_id: string
          retail_price?: number | null
          unit_id: string
          updated_at?: string
          wholesale_price?: number | null
        }
        Update: {
          conversion_factor?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          product_id?: string
          retail_price?: number | null
          unit_id?: string
          updated_at?: string
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string
          color: string | null
          cost: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_web_visible: boolean
          model: string | null
          name: string
          notes: string | null
          size: string | null
          sku: string
          slug: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id: string
          color?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_web_visible?: boolean
          model?: string | null
          name: string
          notes?: string | null
          size?: string | null
          sku: string
          slug: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string
          color?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_web_visible?: boolean
          model?: string | null
          name?: string
          notes?: string | null
          size?: string | null
          sku?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          conversion_factor: number
          created_at: string
          discount_amount: number
          id: string
          price_type: string | null
          product_id: string
          product_unit_id: string | null
          quantity: number
          quotation_id: string
          source_currency: string | null
          source_lot_id: string | null
          source_rate: number | null
          subtotal: number
          tier_label: string | null
          tier_min_quantity: number | null
          unit_name: string
          unit_price: number
          warehouse_id: string | null
        }
        Insert: {
          conversion_factor?: number
          created_at?: string
          discount_amount?: number
          id?: string
          price_type?: string | null
          product_id: string
          product_unit_id?: string | null
          quantity: number
          quotation_id: string
          source_currency?: string | null
          source_lot_id?: string | null
          source_rate?: number | null
          subtotal?: number
          tier_label?: string | null
          tier_min_quantity?: number | null
          unit_name: string
          unit_price: number
          warehouse_id?: string | null
        }
        Update: {
          conversion_factor?: number
          created_at?: string
          discount_amount?: number
          id?: string
          price_type?: string | null
          product_id?: string
          product_unit_id?: string | null
          quantity?: number
          quotation_id?: string
          source_currency?: string | null
          source_lot_id?: string | null
          source_rate?: number | null
          subtotal?: number
          tier_label?: string | null
          tier_min_quantity?: number | null
          unit_name?: string
          unit_price?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_product_unit_id_fkey"
            columns: ["product_unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_source_currency_fkey"
            columns: ["source_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quotation_items_source_lot_id_fkey"
            columns: ["source_lot_id"]
            isOneToOne: false
            referencedRelation: "stock_entry_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          converted_sale_id: string | null
          created_at: string
          created_by: string
          currency: string
          discount_amount: number
          exchange_rate: number | null
          id: string
          quotation_number: string
          status: string
          subtotal: number
          tax_rate: number
          terms_conditions: string | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          converted_sale_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          discount_amount?: number
          exchange_rate?: number | null
          id?: string
          quotation_number: string
          status?: string
          subtotal?: number
          tax_rate?: number
          terms_conditions?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          converted_sale_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          discount_amount?: number
          exchange_rate?: number | null
          id?: string
          quotation_number?: string
          status?: string
          subtotal?: number
          tax_rate?: number
          terms_conditions?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_converted_sale_id_fkey"
            columns: ["converted_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      return_items: {
        Row: {
          condition: string
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          product_id: string
          product_unit_id: string | null
          quantity: number
          restock: boolean
          return_id: string
          sale_item_id: string | null
          source_lot_item_id: string | null
          subtotal: number
          unit_name: string
          unit_price: number
        }
        Insert: {
          condition?: string
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          product_id: string
          product_unit_id?: string | null
          quantity: number
          restock?: boolean
          return_id: string
          sale_item_id?: string | null
          source_lot_item_id?: string | null
          subtotal?: number
          unit_name: string
          unit_price: number
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          product_id?: string
          product_unit_id?: string | null
          quantity?: number
          restock?: boolean
          return_id?: string
          sale_item_id?: string | null
          source_lot_item_id?: string | null
          subtotal?: number
          unit_name?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_product_unit_id_fkey"
            columns: ["product_unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_source_lot_item_id_fkey"
            columns: ["source_lot_item_id"]
            isOneToOne: false
            referencedRelation: "stock_entry_items"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          approved_by: string | null
          cash_session_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          exchange_rate: number | null
          id: string
          processed_by: string | null
          reason: string
          resolution_type: string
          return_number: string
          sale_id: string
          status: string
          total_amount: number
          total_base: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          approved_by?: string | null
          cash_session_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          exchange_rate?: number | null
          id?: string
          processed_by?: string | null
          reason: string
          resolution_type: string
          return_number: string
          sale_id: string
          status?: string
          total_amount?: number
          total_base?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          approved_by?: string | null
          cash_session_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          exchange_rate?: number | null
          id?: string
          processed_by?: string | null
          reason?: string
          resolution_type?: string
          return_number?: string
          sale_id?: string
          status?: string
          total_amount?: number
          total_base?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "returns_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          key: string
          label: string
        }
        Insert: {
          id?: string
          key: string
          label: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          conversion_factor: number
          created_at: string
          discount_amount: number
          id: string
          price_source: string | null
          price_type: string | null
          product_id: string
          product_unit_id: string | null
          quantity: number
          sale_id: string
          source_lot_id: string | null
          subtotal: number
          tier_label: string | null
          tier_min_quantity: number | null
          unit_name: string
          unit_price: number
          warehouse_id: string
        }
        Insert: {
          conversion_factor?: number
          created_at?: string
          discount_amount?: number
          id?: string
          price_source?: string | null
          price_type?: string | null
          product_id: string
          product_unit_id?: string | null
          quantity: number
          sale_id: string
          source_lot_id?: string | null
          subtotal?: number
          tier_label?: string | null
          tier_min_quantity?: number | null
          unit_name: string
          unit_price: number
          warehouse_id: string
        }
        Update: {
          conversion_factor?: number
          created_at?: string
          discount_amount?: number
          id?: string
          price_source?: string | null
          price_type?: string | null
          product_id?: string
          product_unit_id?: string | null
          quantity?: number
          sale_id?: string
          source_lot_id?: string | null
          subtotal?: number
          tier_label?: string | null
          tier_min_quantity?: number | null
          unit_name?: string
          unit_price?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_unit_id_fkey"
            columns: ["product_unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_source_lot_id_fkey"
            columns: ["source_lot_id"]
            isOneToOne: false
            referencedRelation: "stock_entry_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_method: string
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          advance_amount: number
          amount_paid: number
          amount_pending: number
          balance_due: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_session_id: string | null
          change_amount: number
          client_id: string | null
          created_at: string
          credit_due_date: string | null
          credit_status: string | null
          currency: string
          delivery_notes: string | null
          discount_amount: number
          discount_percent: number
          exchange_rate: number | null
          id: string
          notes: string | null
          payment_method: string
          quotation_id: string | null
          sale_mode: string
          sale_number: string
          sale_type: string
          shipping_date: string | null
          sold_by: string
          status: string
          subtotal: number
          subtotal_base: number | null
          tax_amount: number
          tax_rate: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          advance_amount?: number
          amount_paid?: number
          amount_pending?: number
          balance_due?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_session_id?: string | null
          change_amount?: number
          client_id?: string | null
          created_at?: string
          credit_due_date?: string | null
          credit_status?: string | null
          currency?: string
          delivery_notes?: string | null
          discount_amount?: number
          discount_percent?: number
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          payment_method?: string
          quotation_id?: string | null
          sale_mode?: string
          sale_number: string
          sale_type?: string
          shipping_date?: string | null
          sold_by: string
          status?: string
          subtotal?: number
          subtotal_base?: number | null
          tax_amount?: number
          tax_rate?: number
          total?: number
          total_base?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          advance_amount?: number
          amount_paid?: number
          amount_pending?: number
          balance_due?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_session_id?: string | null
          change_amount?: number
          client_id?: string | null
          created_at?: string
          credit_due_date?: string | null
          credit_status?: string | null
          currency?: string
          delivery_notes?: string | null
          discount_amount?: number
          discount_percent?: number
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          payment_method?: string
          quotation_id?: string | null
          sale_mode?: string
          sale_number?: string
          sale_type?: string
          shipping_date?: string | null
          sold_by?: string
          status?: string
          subtotal?: number
          subtotal_base?: number | null
          tax_amount?: number
          tax_rate?: number
          total?: number
          total_base?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      staff_roles: {
        Row: {
          granted_at: string
          role_id: string
          staff_id: string
        }
        Insert: {
          granted_at?: string
          role_id: string
          staff_id: string
        }
        Update: {
          granted_at?: string
          role_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_entries: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string
          dim_document_url: string | null
          dim_number: string | null
          entry_date: string
          entry_number: string
          id: string
          notes: string | null
          reference: string | null
          status: string
          total_boxes: number
          total_items: number
          total_units: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by: string
          dim_document_url?: string | null
          dim_number?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          notes?: string | null
          reference?: string | null
          status?: string
          total_boxes?: number
          total_items?: number
          total_units?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string
          dim_document_url?: string | null
          dim_number?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          notes?: string | null
          reference?: string | null
          status?: string
          total_boxes?: number
          total_items?: number
          total_units?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_entry_items: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          product_id: string
          quantity: number
          stock_entry_id: string
          unit_cost: number
          unit_id: string
          units_per_box: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          product_id: string
          quantity: number
          stock_entry_id: string
          unit_cost?: number
          unit_id: string
          units_per_box?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          product_id?: string
          quantity?: number
          stock_entry_id?: string
          unit_cost?: number
          unit_id?: string
          units_per_box?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_entry_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entry_items_stock_entry_id_fkey"
            columns: ["stock_entry_id"]
            isOneToOne: false
            referencedRelation: "stock_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entry_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          to_location_id: string | null
          transfer_id: string
          unit_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          to_location_id?: string | null
          transfer_id: string
          unit_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          to_location_id?: string | null
          transfer_id?: string
          unit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_lots: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          stock_entry_item_id: string | null
          stock_type: string | null
          transfer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          stock_entry_item_id?: string | null
          stock_type?: string | null
          transfer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          stock_entry_item_id?: string | null
          stock_type?: string | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_lots_stock_entry_item_id_fkey"
            columns: ["stock_entry_item_id"]
            isOneToOne: false
            referencedRelation: "stock_entry_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_lots_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string
          from_warehouse_id: string
          id: string
          notes: string | null
          reason: string | null
          received_at: string | null
          requested_at: string
          requested_by: string
          sent_at: string | null
          status: string
          to_warehouse_id: string
          transfer_number: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by: string
          from_warehouse_id: string
          id?: string
          notes?: string | null
          reason?: string | null
          received_at?: string | null
          requested_at?: string
          requested_by: string
          sent_at?: string | null
          status?: string
          to_warehouse_id: string
          transfer_number: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string
          from_warehouse_id?: string
          id?: string
          notes?: string | null
          reason?: string | null
          received_at?: string | null
          requested_at?: string
          requested_by?: string
          sent_at?: string | null
          status?: string
          to_warehouse_id?: string
          transfer_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_locations: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_stock: {
        Row: {
          created_at: string
          id: string
          last_count_date: string | null
          location_id: string | null
          min_stock: number
          product_id: string
          quantity: number
          stock_entry_item_id: string | null
          stock_type: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_count_date?: string | null
          location_id?: string | null
          min_stock?: number
          product_id: string
          quantity?: number
          stock_entry_item_id?: string | null
          stock_type?: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_count_date?: string | null
          location_id?: string | null
          min_stock?: number
          product_id?: string
          quantity?: number
          stock_entry_item_id?: string | null
          stock_type?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_stock_entry_item_id_fkey"
            columns: ["stock_entry_item_id"]
            isOneToOne: false
            referencedRelation: "stock_entry_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          phone: string | null
          responsible_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          phone?: string | null
          responsible_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          phone?: string | null
          responsible_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      web_customers: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          client_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      web_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_unit_id: string | null
          quantity: number
          subtotal: number
          unit_name: string
          unit_price: number
          unit_price_base: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_unit_id?: string | null
          quantity: number
          subtotal?: number
          unit_name?: string
          unit_price: number
          unit_price_base?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_unit_id?: string | null
          quantity?: number
          subtotal?: number
          unit_name?: string
          unit_price?: number
          unit_price_base?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "web_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "web_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_order_items_product_unit_id_fkey"
            columns: ["product_unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      web_orders: {
        Row: {
          client_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          delivery_notes: string | null
          exchange_rate: number | null
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string
          sale_id: string | null
          status: string
          subtotal: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string | null
          web_customer_id: string | null
        }
        Insert: {
          client_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          delivery_notes?: string | null
          exchange_rate?: number | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number: string
          sale_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          total_base?: number | null
          updated_at?: string
          warehouse_id?: string | null
          web_customer_id?: string | null
        }
        Update: {
          client_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          delivery_notes?: string | null
          exchange_rate?: number | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string
          sale_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          total_base?: number | null
          updated_at?: string
          warehouse_id?: string | null
          web_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_orders_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "web_orders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_orders_web_customer_id_fkey"
            columns: ["web_customer_id"]
            isOneToOne: false
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _doc_number: {
        Args: { p_prefix: string; p_value: number }
        Returns: string
      }
      _emit_sale_exit: { Args: { p_sale_id: string }; Returns: undefined }
      _insert_sale_items: {
        Args: { p_items: Json; p_sale_id: string; p_warehouse_id: string }
        Returns: number
      }
      add_cash_movement: {
        Args: {
          p_amount: number
          p_currency?: string
          p_description?: string
          p_expense_category?: string
          p_movement_type: string
          p_reference_id?: string
          p_reference_type?: string
          p_session_id: string
        }
        Returns: {
          amount: number
          amount_base: number | null
          created_at: string
          created_by: string
          currency: string
          description: string | null
          exchange_rate: number | null
          expense_category: string | null
          id: string
          movement_type: string
          reference_id: string | null
          reference_type: string | null
          session_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_staff: { Args: never; Returns: undefined }
      close_cash_session: {
        Args: {
          p_actual_amount: number
          p_notes?: string
          p_session_id: string
        }
        Returns: {
          actual_amount: number | null
          closed_at: string | null
          closed_by: string | null
          closing_notes: string | null
          created_at: string
          difference: number | null
          expected_amount: number
          id: string
          opened_at: string
          opened_by: string
          opening_amount: number
          register_id: string
          status: string
          total_cash_sales: number
          total_expenses: number
          total_qr_sales: number
          total_sales: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      convert_quotation_to_sale: {
        Args: {
          p_amount_paid?: number
          p_cash_session_id?: string
          p_payment_method?: string
          p_quotation_id: string
          p_warehouse_id: string
        }
        Returns: {
          advance_amount: number
          amount_paid: number
          amount_pending: number
          balance_due: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_session_id: string | null
          change_amount: number
          client_id: string | null
          created_at: string
          credit_due_date: string | null
          credit_status: string | null
          currency: string
          delivery_notes: string | null
          discount_amount: number
          discount_percent: number
          exchange_rate: number | null
          id: string
          notes: string | null
          payment_method: string
          quotation_id: string | null
          sale_mode: string
          sale_number: string
          sale_type: string
          shipping_date: string | null
          sold_by: string
          status: string
          subtotal: number
          subtotal_base: number | null
          tax_amount: number
          tax_rate: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      convert_web_order_to_sale: {
        Args: {
          p_cash_session_id?: string
          p_id: string
          p_payment_method?: string
          p_warehouse_id: string
        }
        Returns: {
          advance_amount: number
          amount_paid: number
          amount_pending: number
          balance_due: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_session_id: string | null
          change_amount: number
          client_id: string | null
          created_at: string
          credit_due_date: string | null
          credit_status: string | null
          currency: string
          delivery_notes: string | null
          discount_amount: number
          discount_percent: number
          exchange_rate: number | null
          id: string
          notes: string | null
          payment_method: string
          quotation_id: string | null
          sale_mode: string
          sale_number: string
          sale_type: string
          shipping_date: string | null
          sold_by: string
          status: string
          subtotal: number
          subtotal_base: number | null
          tax_amount: number
          tax_rate: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_cash_register: {
        Args: { p_name: string; p_warehouse_id: string }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          register_number: string
          updated_at: string
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_registers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_quotation: {
        Args: {
          p_client_id?: string
          p_client_name?: string
          p_client_phone?: string
          p_discount_amount?: number
          p_items: Json
          p_tax_rate?: number
          p_terms_conditions?: string
          p_valid_until?: string
        }
        Returns: {
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          converted_sale_id: string | null
          created_at: string
          created_by: string
          currency: string
          discount_amount: number
          exchange_rate: number | null
          id: string
          quotation_number: string
          status: string
          subtotal: number
          tax_rate: number
          terms_conditions: string | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        SetofOptions: {
          from: "*"
          to: "quotations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_web_order: {
        Args: {
          p_contact_name: string
          p_contact_phone: string
          p_currency?: string
          p_delivery_notes: string
          p_idempotency_key?: string
          p_lines: Json
          p_web_customer_id?: string
        }
        Returns: {
          client_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          delivery_notes: string | null
          exchange_rate: number | null
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string
          sale_id: string | null
          status: string
          subtotal: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string | null
          web_customer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "web_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deliver_order: {
        Args: { p_sale_id: string }
        Returns: {
          advance_amount: number
          amount_paid: number
          amount_pending: number
          balance_due: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_session_id: string | null
          change_amount: number
          client_id: string | null
          created_at: string
          credit_due_date: string | null
          credit_status: string | null
          currency: string
          delivery_notes: string | null
          discount_amount: number
          discount_percent: number
          exchange_rate: number | null
          id: string
          notes: string | null
          payment_method: string
          quotation_id: string | null
          sale_mode: string
          sale_number: string
          sale_type: string
          shipping_date: string | null
          sold_by: string
          status: string
          subtotal: number
          subtotal_base: number | null
          tax_amount: number
          tax_rate: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_rate: {
        Args: { p_currency: string; p_date?: string }
        Returns: number
      }
      fn_to_base: {
        Args: { p_amount: number; p_currency: string; p_date?: string }
        Returns: number
      }
      has_role: { Args: { role_key: string }; Returns: boolean }
      is_active_staff: { Args: never; Returns: boolean }
      open_cash_session: {
        Args: { p_opening_amount: number; p_register_id: string }
        Returns: {
          actual_amount: number | null
          closed_at: string | null
          closed_by: string | null
          closing_notes: string | null
          created_at: string
          difference: number | null
          expected_amount: number
          id: string
          opened_at: string
          opened_by: string
          opening_amount: number
          register_id: string
          status: string
          total_cash_sales: number
          total_expenses: number
          total_qr_sales: number
          total_sales: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      public_warehouses: {
        Args: never
        Returns: {
          address: string
          city: string
          name: string
          phone: string
        }[]
      }
      register_credit_payment: {
        Args: {
          p_amount: number
          p_cash_session_id?: string
          p_payment_method?: string
          p_sale_id: string
        }
        Returns: {
          advance_amount: number
          amount_paid: number
          amount_pending: number
          balance_due: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_session_id: string | null
          change_amount: number
          client_id: string | null
          created_at: string
          credit_due_date: string | null
          credit_status: string | null
          currency: string
          delivery_notes: string | null
          discount_amount: number
          discount_percent: number
          exchange_rate: number | null
          id: string
          notes: string | null
          payment_method: string
          quotation_id: string | null
          sale_mode: string
          sale_number: string
          sale_type: string
          shipping_date: string | null
          sold_by: string
          status: string
          subtotal: number
          subtotal_base: number | null
          tax_amount: number
          tax_rate: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_return: {
        Args: {
          p_cash_session_id?: string
          p_items: Json
          p_reason: string
          p_resolution_type: string
          p_sale_id: string
          p_warehouse_id: string
        }
        Returns: {
          approved_by: string | null
          cash_session_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          exchange_rate: number | null
          id: string
          processed_by: string | null
          reason: string
          resolution_type: string
          return_number: string
          sale_id: string
          status: string
          total_amount: number
          total_base: number | null
          updated_at: string
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "returns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_sale: {
        Args: {
          p_advance_amount?: number
          p_amount_paid?: number
          p_cash_session_id?: string
          p_client_id?: string
          p_credit_due_date?: string
          p_currency?: string
          p_discount_amount?: number
          p_items: Json
          p_notes?: string
          p_payment_method?: string
          p_sale_mode?: string
          p_sale_type?: string
          p_shipping_date?: string
          p_tax_rate?: number
          p_warehouse_id: string
        }
        Returns: {
          advance_amount: number
          amount_paid: number
          amount_pending: number
          balance_due: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_session_id: string | null
          change_amount: number
          client_id: string | null
          created_at: string
          credit_due_date: string | null
          credit_status: string | null
          currency: string
          delivery_notes: string | null
          discount_amount: number
          discount_percent: number
          exchange_rate: number | null
          id: string
          notes: string | null
          payment_method: string
          quotation_id: string | null
          sale_mode: string
          sale_number: string
          sale_type: string
          shipping_date: string | null
          sold_by: string
          status: string
          subtotal: number
          subtotal_base: number | null
          tax_amount: number
          tax_rate: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_web_order_status: {
        Args: { p_id: string; p_status: string }
        Returns: {
          client_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          delivery_notes: string | null
          exchange_rate: number | null
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string
          sale_id: string | null
          status: string
          subtotal: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string | null
          web_customer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "web_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      void_sale: {
        Args: { p_reason: string; p_sale_id: string }
        Returns: {
          advance_amount: number
          amount_paid: number
          amount_pending: number
          balance_due: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_session_id: string | null
          change_amount: number
          client_id: string | null
          created_at: string
          credit_due_date: string | null
          credit_status: string | null
          currency: string
          delivery_notes: string | null
          discount_amount: number
          discount_percent: number
          exchange_rate: number | null
          id: string
          notes: string | null
          payment_method: string
          quotation_id: string | null
          sale_mode: string
          sale_number: string
          sale_type: string
          shipping_date: string | null
          sold_by: string
          status: string
          subtotal: number
          subtotal_base: number | null
          tax_amount: number
          tax_rate: number
          total: number
          total_base: number | null
          updated_at: string
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
