import { supabase } from '../lib/supabase';

export interface CMSPage {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  featured_image_url?: string;
  template: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  og_image?: string;
  custom_css?: string;
  custom_js?: string;
  status: string;
  published_at?: string;
  parent_page_id?: string;
  display_order: number;
  is_homepage: boolean;
  show_in_nav: boolean;
  nav_label?: string;
  author_id?: string;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface CMSBlog {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image_url?: string;
  category_id?: string;
  author_id?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  status: string;
  published_at?: string;
  allow_comments: boolean;
  is_featured: boolean;
  views_count: number;
  reading_time_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface CMSTestimonial {
  id: string;
  author_name: string;
  author_title?: string;
  author_location?: string;
  author_image_url?: string;
  content: string;
  rating: number;
  category?: string;
  is_featured: boolean;
  is_verified: boolean;
  status: string;
  approved_at?: string;
  approved_by?: string;
  display_order: number;
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface CMSFAQ {
  id: string;
  category_id?: string;
  question: string;
  answer: string;
  display_order: number;
  helpful_count: number;
  not_helpful_count: number;
  is_featured: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CMSFAQCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  display_order: number;
  created_at: string;
}

export const cmsService = {
  async getPages(): Promise<CMSPage[]> {
    try {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .order('display_order')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pages:', error);
      return [];
    }
  },

  async getPageBySlug(slug: string): Promise<CMSPage | null> {
    try {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching page:', error);
      return null;
    }
  },

  async createPage(page: Partial<CMSPage>): Promise<CMSPage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('cms_pages')
        .insert({
          ...page,
          author_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating page:', error);
      return null;
    }
  },

  async updatePage(id: string, updates: Partial<CMSPage>): Promise<CMSPage | null> {
    try {
      const { data, error } = await supabase
        .from('cms_pages')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating page:', error);
      return null;
    }
  },

  async deletePage(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cms_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting page:', error);
      return false;
    }
  },

  async getBlogs(): Promise<CMSBlog[]> {
    try {
      const { data, error } = await supabase
        .from('cms_blogs')
        .select('*, cms_blog_categories(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching blogs:', error);
      return [];
    }
  },

  async getBlogBySlug(slug: string): Promise<CMSBlog | null> {
    try {
      const { data, error } = await supabase
        .from('cms_blogs')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching blog:', error);
      return null;
    }
  },

  async createBlog(blog: Partial<CMSBlog>): Promise<CMSBlog | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('cms_blogs')
        .insert({
          ...blog,
          author_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating blog:', error);
      return null;
    }
  },

  async updateBlog(id: string, updates: Partial<CMSBlog>): Promise<CMSBlog | null> {
    try {
      const { data, error } = await supabase
        .from('cms_blogs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating blog:', error);
      return null;
    }
  },

  async deleteBlog(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cms_blogs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting blog:', error);
      return false;
    }
  },

  async getTestimonials(): Promise<CMSTestimonial[]> {
    try {
      const { data, error } = await supabase
        .from('cms_testimonials')
        .select('*')
        .order('display_order')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      return [];
    }
  },

  async createTestimonial(testimonial: Partial<CMSTestimonial>): Promise<CMSTestimonial | null> {
    try {
      const { data, error } = await supabase
        .from('cms_testimonials')
        .insert(testimonial)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating testimonial:', error);
      return null;
    }
  },

  async updateTestimonial(id: string, updates: Partial<CMSTestimonial>): Promise<CMSTestimonial | null> {
    try {
      const { data, error } = await supabase
        .from('cms_testimonials')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating testimonial:', error);
      return null;
    }
  },

  async deleteTestimonial(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cms_testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      return false;
    }
  },

  async getFAQs(): Promise<CMSFAQ[]> {
    try {
      const { data, error } = await supabase
        .from('cms_faqs')
        .select('*, cms_faq_categories(name, slug)')
        .order('display_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return [];
    }
  },

  async getFAQCategories(): Promise<CMSFAQCategory[]> {
    try {
      const { data, error } = await supabase
        .from('cms_faq_categories')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching FAQ categories:', error);
      return [];
    }
  },

  async createFAQ(faq: Partial<CMSFAQ>): Promise<CMSFAQ | null> {
    try {
      const { data, error } = await supabase
        .from('cms_faqs')
        .insert(faq)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating FAQ:', error);
      return null;
    }
  },

  async updateFAQ(id: string, updates: Partial<CMSFAQ>): Promise<CMSFAQ | null> {
    try {
      const { data, error } = await supabase
        .from('cms_faqs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating FAQ:', error);
      return null;
    }
  },

  async deleteFAQ(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cms_faqs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      return false;
    }
  },

  async createFAQCategory(category: Partial<CMSFAQCategory>): Promise<CMSFAQCategory | null> {
    try {
      const { data, error } = await supabase
        .from('cms_faq_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating FAQ category:', error);
      return null;
    }
  },

  async updateFAQCategory(id: string, updates: Partial<CMSFAQCategory>): Promise<CMSFAQCategory | null> {
    try {
      const { data, error } = await supabase
        .from('cms_faq_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating FAQ category:', error);
      return null;
    }
  },

  async deleteFAQCategory(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cms_faq_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting FAQ category:', error);
      return false;
    }
  },

  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  async getCategories(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('cms_blog_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  async createCategory(category: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('cms_blog_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  },

  async updateCategory(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('cms_blog_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      return null;
    }
  },

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cms_blog_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  },

  async getTags(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('cms_blog_tags')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  },

  async createTag(tag: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('cms_blog_tags')
        .insert(tag)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating tag:', error);
      return null;
    }
  },

  async updateTag(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('cms_blog_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating tag:', error);
      return null;
    }
  },

  async deleteTag(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cms_blog_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  },

  async getLocationContents(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('cms_locations_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching location contents:', error);
      return [];
    }
  },

  async createLocationContent(content: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('cms_locations_content')
        .insert(content)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating location content:', error);
      return null;
    }
  },

  async updateLocationContent(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('cms_locations_content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating location content:', error);
      return null;
    }
  },

  async deleteLocationContent(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cms_locations_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting location content:', error);
      return false;
    }
  },
};
