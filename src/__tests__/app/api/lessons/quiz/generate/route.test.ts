import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/lessons/quiz/generate/route'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/subscription', () => ({
  checkSubscription: vi.fn(),
}))

vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: vi.fn(),
  },
}))

vi.mock('@/lib/lesson-blocks', () => ({
  extractContentFromBlocks: vi.fn((blocks) => 
    blocks.map((b: any) => b.content).join(' ')
  ),
}))

import { createClient } from '@/lib/supabase/server'
import { checkSubscription } from '@/lib/subscription'
import { inngest } from '@/lib/inngest/client'
import { extractContentFromBlocks } from '@/lib/lesson-blocks'

describe('POST /api/lessons/quiz/generate', () => {
  let mockSupabase: any
  let mockRequest: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }
    
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
    vi.mocked(checkSubscription).mockResolvedValue({ isSubscribed: true })
    vi.mocked(inngest.send).mockResolvedValue(undefined as any)
  })

  describe('Input Validation', () => {
    it('should return 400 if lessonId is missing', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({
          questionTypes: ['multiple_choice'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toBe('Lesson ID is required')
      expect(response.status).toBe(400)
    })

    it('should return 400 if questionTypes is missing', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toContain('questionTypes')
      expect(response.status).toBe(400)
    })

    it('should return 400 if questionTypes is not an array', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: 'not-an-array',
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toContain('questionTypes')
      expect(response.status).toBe(400)
    })

    it('should return 400 if questionTypes is empty array', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: [],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toContain('questionTypes')
      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid question types', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['invalid_type', 'another_invalid'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toContain('Invalid question types')
      expect(response.status).toBe(400)
    })

    it('should accept valid question types', async () => {
      const validTypes = ['multiple_choice', 'true_false', 'fill_in_blank']
      
      for (const type of validTypes) {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        })
        
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { user_id: 'user-123', title: 'Test Lesson' },
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'quiz-123', title: 'Test Quiz 1' },
                error: null,
              }),
            }),
          }),
        })

        mockRequest = {
          json: vi.fn().mockResolvedValue({
            lessonId: 'lesson-123',
            questionTypes: [type],
          }),
        } as any

        const response = await POST(mockRequest)
        
        expect(response.status).not.toBe(400)
      }
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toBe('Unauthorized')
      expect(response.status).toBe(401)
    })

    it('should return 403 if user is not subscribed', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      vi.mocked(checkSubscription).mockResolvedValue({ isSubscribed: false })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toBe('SUBSCRIPTION_REQUIRED')
      expect(response.status).toBe(403)
    })

    it('should return 404 if lesson not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toBe('Lesson not found')
      expect(response.status).toBe(404)
    })

    it('should return 403 if user does not own the lesson', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { user_id: 'different-user' },
              error: null,
            }),
          }),
        }),
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toBe('Unauthorized')
      expect(response.status).toBe(403)
    })
  })

  describe('Section-based Quiz Generation', () => {
    it('should return 404 if section not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // First call for lesson
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-123', title: 'Test' },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Second call for section
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Not found'),
                  }),
                }),
              }),
            }),
          }
        }
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
          sectionId: 'section-456',
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toContain('Section not found')
      expect(response.status).toBe(404)
    })

    it('should return 400 if section has no content', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-123', title: 'Test' },
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'section-456', title: 'Section' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        } else {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
          sectionId: 'section-456',
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.error).toBe('Section has no content')
      expect(response.status).toBe(400)
    })

    it('should extract content from section blocks', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const sectionBlocks = [
        { type: 'paragraph', content: 'Test content', order_index: 0, callout_type: null },
      ]

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-123', title: 'Lesson' },
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'section-456', title: 'Section Title' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        } else if (callCount === 3) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: sectionBlocks,
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 4) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'quiz-789', title: 'Quiz' },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
          sectionId: 'section-456',
        }),
      } as any

      await POST(mockRequest)

      expect(extractContentFromBlocks).toHaveBeenCalled()
    })
  })

  describe('Quiz Title Generation', () => {
    it('should generate quiz title with number 1 for first quiz', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-123', title: 'My Lesson' },
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'quiz-123', title: 'My Lesson Quiz 1' },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.title).toBe('My Lesson Quiz 1')
    })

    it('should increment quiz number for subsequent quizzes', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-123', title: 'My Lesson' },
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { title: 'My Lesson Quiz 1' },
                  { title: 'My Lesson Quiz 2' },
                ],
                error: null,
              }),
            }),
          }
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'quiz-123', title: 'My Lesson Quiz 3' },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.body.title).toBe('My Lesson Quiz 3')
    })
  })

  describe('Success Response', () => {
    it('should return success response with quiz details', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-123', title: 'Test' },
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'quiz-123', title: 'Test Quiz 1' },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice', 'true_false'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.quizId).toBe('quiz-123')
      expect(response.body.title).toBe('Test Quiz 1')
      expect(response.body.generating).toBe(true)
      expect(response.body.status).toBe('generating')
    })

    it('should trigger Inngest event with correct data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-123', title: 'Test' },
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'quiz-789', title: 'Quiz' },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['fill_in_blank'],
        }),
      } as any

      await POST(mockRequest)

      expect(inngest.send).toHaveBeenCalledWith({
        name: 'quiz/generate',
        data: expect.objectContaining({
          quizId: 'quiz-789',
          lessonId: 'lesson-123',
          questionTypes: ['fill_in_blank'],
        }),
      })
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database error'))

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          lessonId: 'lesson-123',
          questionTypes: ['multiple_choice'],
        }),
      } as any

      const response = await POST(mockRequest)

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to generate quiz')
    })

    it('should handle malformed JSON request', async () => {
      mockRequest = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any

      const response = await POST(mockRequest)

      expect(response.status).toBe(500)
    })
  })
})