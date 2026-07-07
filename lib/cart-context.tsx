"use client";

import { createContext, useContext, useReducer, ReactNode, useState, useEffect } from 'react';
import { notifyCartChanged, pushMarketplaceToast } from './client-toast';
import { getCartSnapshot } from './cart';
import type { CartSnapshot, CartItem } from './types';

type CartAction = 
  | { type: 'ADD_ITEM'; item: Omit<CartItem, 'id'> }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'SET_CART'; snapshot: CartSnapshot }
  | { type: 'RESET_CART' };

interface CartContextType {
  cart: CartSnapshot;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  isOptimistic: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

function cartReducer(state: CartSnapshot, action: CartAction): CartSnapshot {
  switch (action.type) {
    case 'SET_CART':
      return action.snapshot;
    case 'ADD_ITEM': {
      // Optimistic add
      const newItem = { ...action.item, id: `opt-${Date.now()}` };
      return {
        ...state,
        items: [newItem, ...state.items],
        total: state.total + (newItem.product.price * newItem.quantity)
      };
    }
    case 'UPDATE_QUANTITY':
      return state;
    case 'REMOVE_ITEM':
      return state;
    case 'RESET_CART':
      return { items: [], subtotal: 0, total: 0, shippingFee: 0, discountTotal: 0, estimatedDeliveryLabel: '' };
    default:
      return state;
  }
}

export function CartProvider({ children, initialCart }: { children: ReactNode; initialCart: CartSnapshot }) {
  const [state, dispatch] = useReducer(cartReducer, initialCart);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Hydrate from LocalStorage after initial mount to prevent Server/Client mismatch panics
  useEffect(() => {
    try {
      const persisted = localStorage.getItem('royal-cart-storage');
      if (persisted) {
        dispatch({ type: 'SET_CART', snapshot: JSON.parse(persisted) });
      }
    } catch (e) {
      console.error("Failed to parse cart localStorage", e);
    }
    setIsHydrated(true);
  }, []);

  // 2. Sync to LocalStorage continuously
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('royal-cart-storage', JSON.stringify(state));
    }
  }, [state, isHydrated]);

  const addItem = (item: Omit<CartItem, 'id'>) => {
    setIsOptimistic(true);
    dispatch({ type: 'ADD_ITEM', item });
    pushMarketplaceToast({ title: 'Added to cart!' });
    setIsOptimistic(false);
    notifyCartChanged();
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    setIsOptimistic(true);
    dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
  };

  const removeItem = (productId: string) => {
    pushMarketplaceToast({ title: 'Removed from cart' });
    dispatch({ type: 'REMOVE_ITEM', productId });
  };

  const clearCart = () => dispatch({ type: 'RESET_CART' });

  const value = {
    cart: state,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    isOptimistic
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

