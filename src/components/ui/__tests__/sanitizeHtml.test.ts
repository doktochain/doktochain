import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../RichTextEditor';

describe('sanitizeHtml', () => {
  describe('allowed tags', () => {
    it('preserves basic formatting tags', () => {
      const html = '<p>Hello <b>bold</b> <i>italic</i> <u>underline</u></p>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<p>');
      expect(result).toContain('<b>bold</b>');
      expect(result).toContain('<i>italic</i>');
      expect(result).toContain('<u>underline</u>');
    });

    it('preserves heading tags', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<h2>Subtitle</h2>');
      expect(result).toContain('<h3>Section</h3>');
    });

    it('preserves list tags', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
    });

    it('preserves anchor tags with valid href', () => {
      const html = '<a href="https://example.com" title="link">Click</a>';
      const result = sanitizeHtml(html);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('title="link"');
      expect(result).toContain('>Click</a>');
    });
  });

  describe('dangerous tags', () => {
    it('strips script tags', () => {
      const html = '<p>Safe</p><script>alert("xss")</script>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<script');
      expect(result).toContain('<p>Safe</p>');
    });

    it('strips iframe tags', () => {
      const html = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<iframe');
    });

    it('strips object and embed tags', () => {
      const html = '<object data="exploit.swf"></object><embed src="exploit.swf">';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
    });

    it('strips form tags but preserves text children', () => {
      const html = '<form action="https://evil.com"><p>Name</p></form>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<form');
      expect(result).toContain('<p>Name</p>');
    });
  });

  describe('event handler attributes', () => {
    it('removes onclick handlers', () => {
      const html = '<p onclick="alert(1)">Click me</p>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onclick');
      expect(result).toContain('<p>Click me</p>');
    });

    it('removes onerror handlers', () => {
      const html = '<p onerror="alert(1)">Text</p>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onerror');
    });

    it('removes onload handlers', () => {
      const html = '<div onload="alert(1)">Content</div>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onload');
    });

    it('removes onmouseover handlers', () => {
      const html = '<span onmouseover="alert(1)">hover</span>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onmouseover');
    });
  });

  describe('link href validation', () => {
    it('allows https URLs', () => {
      const html = '<a href="https://safe.com">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).toContain('href="https://safe.com"');
    });

    it('allows http URLs', () => {
      const html = '<a href="http://site.com">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).toContain('href="http://site.com"');
    });

    it('allows relative paths', () => {
      const html = '<a href="/about">About</a>';
      const result = sanitizeHtml(html);
      expect(result).toContain('href="/about"');
    });

    it('allows hash anchors', () => {
      const html = '<a href="#section">Jump</a>';
      const result = sanitizeHtml(html);
      expect(result).toContain('href="#section"');
    });

    it('neutralizes javascript: URLs', () => {
      const html = '<a href="javascript:alert(1)">XSS</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
      expect(result).toContain('href="#"');
    });

    it('neutralizes data: URLs', () => {
      const html = '<a href="data:text/html,<script>alert(1)</script>">XSS</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('data:');
    });

    it('strips non-allowed attributes on anchor tags', () => {
      const html = '<a href="https://safe.com" style="color:red" class="link">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('style=');
      expect(result).not.toContain('class=');
      expect(result).toContain('href="https://safe.com"');
    });
  });

  describe('HTML comments', () => {
    it('removes HTML comments', () => {
      const html = '<p>Text</p><!-- secret comment --><p>More</p>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('secret comment');
    });
  });

  describe('nested malicious content', () => {
    it('strips deeply nested script tags', () => {
      const html = '<p><b><i><script>alert(1)</script></i></b></p>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<script');
      expect(result).toContain('<p>');
      expect(result).toContain('<b>');
    });

    it('strips attributes from non-anchor elements', () => {
      const html = '<p style="background:url(evil.png)" class="inject">Text</p>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('style=');
      expect(result).not.toContain('class=');
      expect(result).toContain('<p>Text</p>');
    });
  });
});
