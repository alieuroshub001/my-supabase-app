// utils/database/userCrud.ts
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type LeaveBalance = Database['public']['Tables']['leave_balances']['Row'];
type UserRole = 'admin' | 'hr' | 'team' | 'client';

export class UserCrudOperations {
  private supabase = createClient();

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  /**
   * Create a new user profile (used internally after auth signup)
   */
  async createProfile(profileData: ProfileInsert): Promise<{ data: Profile | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return { data: null, error };
      }

      // Create initial leave balances for new user
      if (data?.id) {
        await this.createInitialLeaveBalances(data.id);
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error in createProfile:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Create initial leave balances for a new user
   */
  async createInitialLeaveBalances(userId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const currentYear = new Date().getFullYear();
      const { error } = await this.supabase
        .from('leave_balances')
        .insert([
          { user_id: userId, leave_type: 'casual', total_days: 12, used_days: 0, remaining_days: 12, year: currentYear },
          { user_id: userId, leave_type: 'sick', total_days: 10, used_days: 0, remaining_days: 10, year: currentYear },
          { user_id: userId, leave_type: 'annual', total_days: 21, used_days: 0, remaining_days: 21, year: currentYear }
        ]);

      if (error) {
        console.error('Error creating leave balances:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (err) {
      console.error('Unexpected error in createInitialLeaveBalances:', err);
      return { success: false, error: err };
    }
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  /**
   * Get current user profile
   */
  async getCurrentUserProfile(): Promise<{ data: Profile | null; error: any }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        return { data: null, error: authError || new Error('User not authenticated') };
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in getCurrentUserProfile:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in getUserProfile:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Get all users with pagination and filtering
   */
  async getAllUsers(options: {
    page?: number;
    limit?: number;
    role?: UserRole;
    department?: string;
    isActive?: boolean;
    searchTerm?: string;
  } = {}): Promise<{ data: Profile[] | null; error: any; count?: number }> {
    try {
      const { page = 1, limit = 10, role, department, isActive, searchTerm } = options;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (role) {
        query = query.eq('role', role);
      }
      if (department) {
        query = query.eq('department', department);
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      return { data, error, count: count || 0 };
    } catch (err) {
      console.error('Unexpected error in getAllUsers:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<{ data: Profile[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)
        .order('full_name');

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in getUsersByRole:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Get users by department
   */
  async getUsersByDepartment(department: string): Promise<{ data: Profile[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('department', department)
        .eq('is_active', true)
        .order('full_name');

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in getUsersByDepartment:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Get user leave balances
   */
  async getUserLeaveBalances(userId: string, year?: number): Promise<{ data: LeaveBalance[] | null; error: any }> {
    try {
      const targetYear = year || new Date().getFullYear();
      
      const { data, error } = await this.supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('year', targetYear);

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in getUserLeaveBalances:', err);
      return { data: null, error: err };
    }
  }

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  /**
   * Update current user profile
   */
  async updateCurrentUserProfile(updates: ProfileUpdate): Promise<{ data: Profile | null; error: any }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        return { data: null, error: authError || new Error('User not authenticated') };
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in updateCurrentUserProfile:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Update user profile by ID (admin operation)
   */
  async updateUserProfile(userId: string, updates: ProfileUpdate): Promise<{ data: Profile | null; error: any }> {
    try {
      // Check if current user has permission to update other users
      const { data: currentUser } = await this.getCurrentUserProfile();
      if (!currentUser || !['admin', 'hr'].includes(currentUser.role)) {
        return { data: null, error: new Error('Insufficient permissions to update user profile') };
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in updateUserProfile:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Activate/Deactivate user
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<{ data: Profile | null; error: any }> {
    try {
      // Check permissions
      const { data: currentUser } = await this.getCurrentUserProfile();
      if (!currentUser || !['admin', 'hr'].includes(currentUser.role)) {
        return { data: null, error: new Error('Insufficient permissions to change user status') };
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in toggleUserStatus:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<{ data: Profile | null; error: any }> {
    try {
      // Check if current user is admin
      const { data: currentUser } = await this.getCurrentUserProfile();
      if (!currentUser || currentUser.role !== 'admin') {
        return { data: null, error: new Error('Only administrators can change user roles') };
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in updateUserRole:', err);
      return { data: null, error: err };
    }
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  /**
   * Soft delete user (set as inactive)
   */
  async softDeleteUser(userId: string): Promise<{ success: boolean; error?: any }> {
    try {
      // Check permissions
      const { data: currentUser } = await this.getCurrentUserProfile();
      if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: new Error('Only administrators can delete users') };
      }

      const { error } = await this.supabase
        .from('profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (err) {
      console.error('Unexpected error in softDeleteUser:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Hard delete user (permanent deletion - use with caution)
   */
  async hardDeleteUser(userId: string): Promise<{ success: boolean; error?: any }> {
    try {
      // Check permissions
      const { data: currentUser } = await this.getCurrentUserProfile();
      if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: new Error('Only administrators can permanently delete users') };
      }

      // Note: This will cascade delete related records due to foreign key constraints
      const { error } = await this.supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (err) {
      console.error('Unexpected error in hardDeleteUser:', err);
      return { success: false, error: err };
    }
  }

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  /**
   * Search users by name or email
   */
  async searchUsers(searchTerm: string, limit: number = 10): Promise<{ data: Profile[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(limit)
        .order('full_name');

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in searchUsers:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<{ 
    data: {
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
      usersByRole: Record<UserRole, number>;
      usersByDepartment: Record<string, number>;
    } | null; 
    error: any 
  }> {
    try {
      // Get total counts
      const { count: totalUsers } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get users by role
      const { data: roleData } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('is_active', true);

      // Get users by department
      const { data: departmentData } = await this.supabase
        .from('profiles')
        .select('department')
        .eq('is_active', true)
        .not('department', 'is', null);

      const usersByRole: Record<UserRole, number> = {
        admin: 0,
        hr: 0,
        team: 0,
        client: 0
      };

      roleData?.forEach(user => {
        if (user.role in usersByRole) {
          usersByRole[user.role as UserRole]++;
        }
      });

      const usersByDepartment: Record<string, number> = {};
      departmentData?.forEach(user => {
        if (user.department) {
          usersByDepartment[user.department] = (usersByDepartment[user.department] || 0) + 1;
        }
      });

      const statistics = {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        inactiveUsers: (totalUsers || 0) - (activeUsers || 0),
        usersByRole,
        usersByDepartment
      };

      return { data: statistics, error: null };
    } catch (err) {
      console.error('Unexpected error in getUserStatistics:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Check if email exists
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean; error?: any }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows found
        return { exists: false };
      }

      if (error) {
        return { exists: false, error };
      }

      return { exists: !!data };
    } catch (err) {
      console.error('Unexpected error in checkEmailExists:', err);
      return { exists: false, error: err };
    }
  }
}

// Export a singleton instance
export const userCrud = new UserCrudOperations();