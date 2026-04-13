import { api } from '../lib/api-client';

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
      const { data, error } = await api.get<CMSPage[]>('/cms-pages', {
        params: { order: 'display_order,created_at.desc' },
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pages:', error);
      return [];
    }
  },

  async getPageBySlug(slug: string): Promise<CMSPage | null> {
    try {
      const { data, error } = await api.get<CMSPage>('/cms-pages', {
        params: { slug, single: true },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching page:', error);
      return null;
    }
  },

  async createPage(page: Partial<CMSPage>): Promise<CMSPage | null> {
    try {
      const { data, error } = await api.post<CMSPage>('/cms-pages', page);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating page:', error);
      return null;
    }
  },

  async updatePage(id: string, updates: Partial<CMSPage>): Promise<CMSPage | null> {
    try {
      const { data, error } = await api.put<CMSPage>(`/cms-pages/${id}`, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating page:', error);
      return null;
    }
  },

  async deletePage(id: string): Promise<boolean> {
    try {
      const { error } = await api.delete(`/cms-pages/${id}`);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting page:', error);
      return false;
    }
  },

  async getBlogs(): Promise<CMSBlog[]> {
    try {
      const { data, error } = await api.get<CMSBlog[]>('/cms-blogs', {
        params: { order: 'created_at.desc', include: 'category' },
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching blogs:', error);
      return [];
    }
  },

  async getBlogBySlug(slug: string): Promise<CMSBlog | null> {
    try {
      const { data, error } = await api.get<CMSBlog>('/cms-blogs', {
        params: { slug, single: true },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching blog:', error);
      return null;
    }
  },

  async createBlog(blog: Partial<CMSBlog>): Promise<CMSBlog | null> {
    try {
      const { data, error } = await api.post<CMSBlog>('/cms-blogs', blog);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating blog:', error);
      return null;
    }
  },

  async updateBlog(id: string, updates: Partial<CMSBlog>): Promise<CMSBlog | null> {
    try {
      const { data, error } = await api.put<CMSBlog>(`/cms-blogs/${id}`, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating blog:', error);
      return null;
    }
  },

  async deleteBlog(id: string): Promise<boolean> {
    try {
      const { error } = await api.delete(`/cms-blogs/${id}`);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting blog:', error);
      return false;
    }
  },

  async getTestimonials(): Promise<CMSTestimonial[]> {
    try {
      const { data, error } = await api.get<CMSTestimonial[]>('/cms-testimonials', {
        params: { order: 'display_order,created_at.desc' },
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      return [];
    }
  },

  async createTestimonial(testimonial: Partial<CMSTestimonial>): Promise<CMSTestimonial | null> {
    try {
      const { data, error } = await api.post<CMSTestimonial>('/cms-testimonials', testimonial);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating testimonial:', error);
      return null;
    }
  },

  async updateTestimonial(id: string, updates: Partial<CMSTestimonial>): Promise<CMSTestimonial | null> {
    try {
      const { data, error } = await api.put<CMSTestimonial>(`/cms-testimonials/${id}`, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating testimonial:', error);
      return null;
    }
  },

  async deleteTestimonial(id: string): Promise<boolean> {
    try {
      const { error } = await api.delete(`/cms-testimonials/${id}`);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      return false;
    }
  },

  async getFAQs(): Promise<CMSFAQ[]> {
    try {
      const { data, error } = await api.get<CMSFAQ[]>('/cms-faqs', {
        params: { order: 'display_order', include: 'category' },
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return [];
    }
  },

  async getFAQCategories(): Promise<CMSFAQCategory[]> {
    try {
      const { data, error } = await api.get<CMSFAQCategory[]>('/cms-faq-categories', {
        params: { order: 'display_order' },
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching FAQ categories:', error);
      return [];
    }
  },

  async createFAQ(faq: Partial<CMSFAQ>): Promise<CMSFAQ | null> {
    try {
      const { data, error } = await api.post<CMSFAQ>('/cms-faqs', faq);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating FAQ:', error);
      return null;
    }
  },

  async updateFAQ(id: string, updates: Partial<CMSFAQ>): Promise<CMSFAQ | null> {
    try {
      const { data, error } = await api.put<CMSFAQ>(`/cms-faqs/${id}`, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating FAQ:', error);
      return null;
    }
  },

  async deleteFAQ(id: string): Promise<boolean> {
    try {
      const { error } = await api.delete(`/cms-faqs/${id}`);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      return false;
    }
  },

  async createFAQCategory(category: Partial<CMSFAQCategory>): Promise<CMSFAQCategory | null> {
    try {
      const { data, error } = await api.post<CMSFAQCategory>('/cms-faq-categories', category);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating FAQ category:', error);
      return null;
    }
  },

  async updateFAQCategory(id: string, updates: Partial<CMSFAQCategory>): Promise<CMSFAQCategory | null> {
    try {
      const { data, error } = await api.put<CMSFAQCategory>(`/cms-faq-categories/${id}`, updates);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating FAQ category:', error);
      return null;
    }
  },

  async deleteFAQCategory(id: string): Promise<boolean> {
    try {
      const { error } = await api.delete(`/cms-faq-categories/${id}`);

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
      const { data, error } = await api.get<any[]>('/cms-blog-categories', {
        params: { order: 'name' },
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  async createCategory(category: any): Promise<any | null> {
    try {
      const { data, error } = await api.post<any>('/cms-blog-categories', category);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  },

  async updateCategory(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await api.put<any>(`/cms-blog-categories/${id}`, updates);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      return null;
    }
  },

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const { error } = await api.delete(`/cms-blog-categories/${id}`);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  },

  async getTags(): Promise<any[]> {
    try {
      const { data, error } = await api.get<any[]>('/cms-blog-tags', {
        params: { order: 'name' },
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  },

  async createTag(tag: any): Promise<any | null> {
    try {
      const { data, error } = await api.post<any>('/cms-blog-tags', tag);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating tag:', error);
      return null;
    }
  },

  async updateTag(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await api.put<any>(`/cms-blog-tags/${id}`, updates);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating tag:', error);
      return null;
    }
  },

  async deleteTag(id: string): Promise<boolean> {
    try {
      const { error } = await api.delete(`/cms-blog-tags/${id}`);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  },

  async getLocationContents(): Promise<any[]> {
    try {
      const { data, error } = await api.get<any[]>('/cms-locations-content', {
        params: { order: 'created_at.desc' },
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching location contents:', error);
      return [];
    }
  },

  async createLocationContent(content: any): Promise<any | null> {
    try {
      const { data, error } = await api.post<any>('/cms-locations-content', content);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating location content:', error);
      return null;
    }
  },

  async updateLocationContent(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await api.put<any>(`/cms-locations-content/${id}`, updates);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating location content:', error);
      return null;
    }
  },

  async deleteLocationContent(id: string): Promise<boolean> {
    try {
      const { error } = await api.delete(`/cms-locations-content/${id}`);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting location content:', error);
      return false;
    }
  },
};
