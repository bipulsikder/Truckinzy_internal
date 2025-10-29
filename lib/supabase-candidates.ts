import { supabase, supabaseAdmin, Database } from './supabase'
import { ComprehensiveCandidateData } from './google-sheets'

// Import the BUCKET_NAME constant from supabase-storage-utils
const { BUCKET_NAME } = require('./supabase-storage-utils')

type CandidateRow = Database['public']['Tables']['candidates']['Row']
type CandidateInsert = Database['public']['Tables']['candidates']['Insert']
type CandidateUpdate = Database['public']['Tables']['candidates']['Update']

export class SupabaseCandidateService {
  // Convert Supabase row to ComprehensiveCandidateData
  private static mapRowToCandidate(row: CandidateRow): ComprehensiveCandidateData {
    return {
      id: row.id,
      _id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || '',
      dateOfBirth: row.date_of_birth || '',
      gender: row.gender || '',
      maritalStatus: row.marital_status || '',
      currentRole: row.current_role,
      desiredRole: row.desired_role || '',
      currentCompany: row.current_company || '',
      location: row.location,
      preferredLocation: row.preferred_location || '',
      totalExperience: row.total_experience,
      currentSalary: row.current_salary || '',
      expectedSalary: row.expected_salary || '',
      noticePeriod: row.notice_period || '',
      highestQualification: row.highest_qualification || '',
      degree: row.degree || '',
      specialization: row.specialization || '',
      university: row.university || '',
      educationYear: row.education_year || '',
      educationPercentage: row.education_percentage || '',
      additionalQualifications: row.additional_qualifications || '',
      technicalSkills: row.technical_skills || [],
      softSkills: row.soft_skills || [],
      languagesKnown: row.languages_known || [],
      certifications: row.certifications || [],
      previousCompanies: row.previous_companies || [],
      jobTitles: row.job_titles || [],
      workDuration: row.work_duration || [],
      keyAchievements: row.key_achievements || [],
      workExperience: [], // Will be populated separately
      education: [], // Will be populated separately
      projects: row.projects || [],
      awards: row.awards || [],
      publications: row.publications || [],
      references: row.references || [],
      linkedinProfile: row.linkedin_profile || '',
      portfolioUrl: row.portfolio_url || '',
      githubProfile: row.github_profile || '',
      summary: row.summary || '',
      resumeText: row.resume_text || '',
      fileName: row.file_name || '',
      filePath: '', // Path in Supabase storage
      fileUrl: row.file_url || '',
      status: row.status,
      tags: row.tags || [],
      rating: row.rating !== null ? row.rating : undefined,
      notes: row.notes || '',
      uploadedAt: row.uploaded_at,
      updatedAt: row.updated_at,
      lastContacted: row.last_contacted || '',
      interviewStatus: row.interview_status,
      feedback: row.feedback || '',
    }
  }

  // Convert ComprehensiveCandidateData to Supabase insert format
  private static mapCandidateToInsert(candidate: Omit<ComprehensiveCandidateData, 'id'>): CandidateInsert {
    return {
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || null,
      date_of_birth: candidate.dateOfBirth || null,
      gender: candidate.gender as any || null,
      marital_status: candidate.maritalStatus as any || null,
      current_role: candidate.currentRole,
      desired_role: candidate.desiredRole || null,
      current_company: candidate.currentCompany || null,
      location: candidate.location,
      preferred_location: candidate.preferredLocation || null,
      total_experience: candidate.totalExperience,
      current_salary: candidate.currentSalary || null,
      expected_salary: candidate.expectedSalary || null,
      notice_period: candidate.noticePeriod || null,
      highest_qualification: candidate.highestQualification || null,
      degree: candidate.degree || null,
      specialization: candidate.specialization || null,
      university: candidate.university || null,
      education_year: candidate.educationYear || null,
      education_percentage: candidate.educationPercentage || null,
      additional_qualifications: candidate.additionalQualifications || null,
      technical_skills: candidate.technicalSkills || [],
      soft_skills: candidate.softSkills || [],
      languages_known: candidate.languagesKnown || [],
      certifications: candidate.certifications || [],
      previous_companies: candidate.previousCompanies || [],
      job_titles: candidate.jobTitles || [],
      work_duration: candidate.workDuration || [],
      key_achievements: candidate.keyAchievements || [],
      projects: candidate.projects || [],
      awards: candidate.awards || [],
      publications: candidate.publications || [],
      references: candidate.references || [],
      linkedin_profile: candidate.linkedinProfile || null,
      portfolio_url: candidate.portfolioUrl || null,
      github_profile: candidate.githubProfile || null,
      summary: candidate.summary || null,
      resume_text: candidate.resumeText || null,
      file_name: candidate.fileName || null,
      file_url: candidate.fileUrl || null,
      file_size: null, // Will be set when file is uploaded
      file_type: null, // Will be set when file is uploaded
      status: candidate.status || 'new',
      tags: candidate.tags || [],
      rating: candidate.rating || null,
      notes: candidate.notes || null,
      uploaded_at: candidate.uploadedAt || new Date().toISOString(),
      updated_at: candidate.updatedAt || new Date().toISOString(),
      last_contacted: candidate.lastContacted || null,
      interview_status: candidate.interviewStatus || 'not-scheduled',
      feedback: candidate.feedback || null,
      parsing_method: 'gemini', // Default to gemini
      parsing_confidence: 0.95, // Default confidence
      parsing_errors: [],
    }
  }

  // Get all candidates
  static async getAllCandidates(): Promise<ComprehensiveCandidateData[]> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error('Error fetching candidates:', error)
        throw error
      }

      const candidates = (data || []).map(row => this.mapRowToCandidate(row))

      // Attach detailed work experience and education in bulk
      const candidateIds = candidates.map(c => c.id).filter(Boolean)
      if (candidateIds.length > 0) {
        try {
          const [{ data: workExps, error: workErr }, { data: educations, error: eduErr }] = await Promise.all([
            supabase.from('work_experience').select('*').in('candidate_id', candidateIds),
            supabase.from('education').select('*').in('candidate_id', candidateIds)
          ])

          if (workErr) console.warn('Work experience fetch (bulk) error:', workErr)
          if (eduErr) console.warn('Education fetch (bulk) error:', eduErr)

          const workByCandidate = new Map<string, any[]>()
          const eduByCandidate = new Map<string, any[]>()

          ;(workExps || []).forEach(exp => {
            const cid = exp.candidate_id
            if (!workByCandidate.has(cid)) workByCandidate.set(cid, [])
            workByCandidate.get(cid)!.push({
              company: exp.company || '',
              role: exp.role || '',
              duration: exp.duration || [(exp.start_date || ''), (exp.end_date || '')].filter(Boolean).join(' - '),
              description: exp.description || ''
            })
          })

          ;(educations || []).forEach(edu => {
            const cid = edu.candidate_id
            if (!eduByCandidate.has(cid)) eduByCandidate.set(cid, [])
            eduByCandidate.get(cid)!.push({
              degree: edu.degree || '',
              specialization: edu.specialization || '',
              institution: edu.institution || '',
              year: edu.year || [(edu.start_date || ''), (edu.end_date || '')].filter(Boolean).join(' - '),
              percentage: edu.percentage || ''
            })
          })

          candidates.forEach(c => {
            c.workExperience = workByCandidate.get(c.id) || []
            c.education = eduByCandidate.get(c.id) || []
          })
        } catch (bulkErr) {
          console.warn('Failed attaching detailed experience/education (bulk):', bulkErr)
        }
      }

      return candidates
    } catch (error) {
      console.error('Failed to get all candidates:', error)
      throw error
    }
  }

  // Add paginated fetch with optional search and sorting
  static async getCandidatesPaginated(options: {
    page?: number,
    perPage?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    search?: string
  } = {}): Promise<{ items: ComprehensiveCandidateData[], total: number, page: number, perPage: number }> {
    const page = Math.max(1, options.page ?? 1)
    const perPage = Math.min(200, Math.max(1, options.perPage ?? 20))
    const sortBy = options.sortBy ?? 'uploaded_at'
    const sortOrder = options.sortOrder ?? 'desc'
    const search = (options.search ?? '').trim()

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    try {
      let query = supabase
        .from('candidates')
        .select('*', { count: 'estimated' })
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (search) {
        // Basic OR filter across common text columns
        const term = `%${search}%`
        query = query.or(
          `name.ilike.${term},location.ilike.${term},current_role.ilike.${term},desired_role.ilike.${term},summary.ilike.${term}`
        )
      }

      const { data, error, count } = await query.range(from, to)

      if (error) {
        console.error('Error fetching candidates (paginated):', error)
        throw error
      }

      const candidates = (data || []).map(row => this.mapRowToCandidate(row))

      // Attach detailed work experience and education for the paginated set
      const candidateIds = candidates.map(c => c.id).filter(Boolean)
      if (candidateIds.length > 0) {
        try {
          const [{ data: workExps, error: workErr }, { data: educations, error: eduErr }] = await Promise.all([
            supabase.from('work_experience').select('*').in('candidate_id', candidateIds),
            supabase.from('education').select('*').in('candidate_id', candidateIds)
          ])

          if (workErr) console.warn('Work experience fetch (paginated) error:', workErr)
          if (eduErr) console.warn('Education fetch (paginated) error:', eduErr)

          const workByCandidate = new Map<string, any[]>()
          const eduByCandidate = new Map<string, any[]>()

          ;(workExps || []).forEach(exp => {
            const cid = exp.candidate_id
            if (!workByCandidate.has(cid)) workByCandidate.set(cid, [])
            workByCandidate.get(cid)!.push({
              company: exp.company || '',
              role: exp.role || '',
              duration: exp.duration || [(exp.start_date || ''), (exp.end_date || '')].filter(Boolean).join(' - '),
              description: exp.description || ''
            })
          })

          ;(educations || []).forEach(edu => {
            const cid = edu.candidate_id
            if (!eduByCandidate.has(cid)) eduByCandidate.set(cid, [])
            eduByCandidate.get(cid)!.push({
              degree: edu.degree || '',
              specialization: edu.specialization || '',
              institution: edu.institution || '',
              year: edu.year || [(edu.start_date || ''), (edu.end_date || '')].filter(Boolean).join(' - '),
              percentage: edu.percentage || ''
            })
          })

          candidates.forEach(c => {
            c.workExperience = workByCandidate.get(c.id) || []
            c.education = eduByCandidate.get(c.id) || []
          })
        } catch (bulkErr) {
          console.warn('Failed attaching detailed experience/education (paginated):', bulkErr)
        }
      }

      return { items: candidates, total: count ?? 0, page, perPage }
    } catch (error) {
      console.error('Failed to get candidates paginated:', error)
      throw error
    }
  }

  // Get candidate by ID
  static async getCandidate(id: string): Promise<ComprehensiveCandidateData | null> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching candidate:', error)
        throw error
      }

      if (!data) {
        return null
      }

      // Convert to ComprehensiveCandidateData format
      const candidate = this.mapRowToCandidate(data)

      // Get file URL if available
      if (data.file_name) {
        try {
          const { data: urlData } = await supabase
            .storage
            .from(BUCKET_NAME)
            .createSignedUrl(data.file_name, 60 * 60) // 1 hour expiry

          if (urlData) {
            candidate.filePath = data.file_name
            candidate.fileUrl = urlData.signedUrl
          }
        } catch (urlError) {
          console.error('Error getting file URL:', urlError)
          // Continue without the URL
        }
      }

      // Fetch work experience data
      try {
        const { data: workExperienceData, error: workExperienceError } = await supabase
          .from('work_experience')
          .select('*')
          .eq('candidate_id', id)
          .order('start_date', { ascending: false })

        if (workExperienceError) {
          console.error('Error fetching work experience:', workExperienceError)
        } else if (workExperienceData && workExperienceData.length > 0) {
          candidate.workExperience = workExperienceData.map(exp => ({
            company: exp.company || '',
            role: exp.role || '',
            duration: exp.duration || [(exp.start_date || ''), (exp.end_date || '')].filter(Boolean).join(' - '),
            description: exp.description || ''
          }))
        }
      } catch (workExpError) {
        console.error('Failed to fetch work experience:', workExpError)
        // Continue without work experience data
      }

      // Fetch education data
      try {
        const { data: educationData, error: educationError } = await supabase
          .from('education')
          .select('*')
          .eq('candidate_id', id)
          .order('year', { ascending: false })

        if (educationError) {
          console.error('Error fetching education:', educationError)
        } else if (educationData && educationData.length > 0) {
          candidate.education = educationData.map(edu => ({
            degree: edu.degree || '',
            specialization: edu.specialization || '',
            institution: edu.institution || '',
            year: edu.year || [(edu.start_date || ''), (edu.end_date || '')].filter(Boolean).join(' - '),
            percentage: edu.percentage || ''
          }))
        }
      } catch (eduError) {
        console.error('Failed to fetch education:', eduError)
        // Continue without education data
      }

      return candidate
    } catch (error) {
      console.error('Failed to get candidate:', error)
      throw error
    }
  }

  // Add new candidate
  static async addCandidate(candidate: Omit<ComprehensiveCandidateData, 'id'>): Promise<string> {
    try {
      const candidateData = this.mapCandidateToInsert(candidate)
      
      const { data, error } = await supabase
        .from('candidates')
        .insert([candidateData])
        .select('id')
        .single()

      if (error) {
        console.error('Error adding candidate:', error)
        throw error
      }
      
      const candidateId = data.id;
      
      // Store work experience data if available
      if (candidate.workExperience && candidate.workExperience.length > 0) {
        for (const exp of candidate.workExperience) {
          const { error: insertError } = await supabase
            .from('work_experience')
            .insert({
              candidate_id: candidateId,
              company: exp.company || '',
              role: exp.role || '',
              duration: exp.duration || '',
              description: exp.description || '',
              location: null,
              responsibilities: null,
              achievements: null,
              technologies: [],
              start_date: null,
              end_date: null,
              is_current: false
            })
          
          if (insertError) {
            console.error('Error inserting work experience:', insertError)
            // Continue with other entries even if one fails
          }
        }
      }
      
      // Store education data if available
      if (candidate.education && candidate.education.length > 0) {
        for (const edu of candidate.education) {
          const { error: insertError } = await supabase
            .from('education')
            .insert({
              candidate_id: candidateId,
              degree: edu.degree || '',
              specialization: edu.specialization || '',
              institution: edu.institution || '',
              year: edu.year || '',
              percentage: edu.percentage || '',
              description: null,
              coursework: null,
              projects: null,
              achievements: null,
              start_date: null,
              end_date: null
            })
          
          if (insertError) {
            console.error('Error inserting education:', insertError)
            // Continue with other entries even if one fails
          }
        }
      }

      return candidateId;
    } catch (error) {
      console.error('Failed to add candidate:', error)
      throw error
    }
  }

  // Update candidate
  static async updateCandidate(id: string, updates: Partial<ComprehensiveCandidateData>): Promise<void> {
    try {
      const updateData: Partial<CandidateUpdate> = {}
      
      // Map only the fields that are being updated
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.email !== undefined) updateData.email = updates.email
      if (updates.phone !== undefined) updateData.phone = updates.phone
      if (updates.currentRole !== undefined) updateData.current_role = updates.currentRole
      if (updates.location !== undefined) updateData.location = updates.location
      if (updates.totalExperience !== undefined) updateData.total_experience = updates.totalExperience
      if (updates.technicalSkills !== undefined) updateData.technical_skills = updates.technicalSkills
      if (updates.softSkills !== undefined) updateData.soft_skills = updates.softSkills
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.notes !== undefined) updateData.notes = updates.notes
      if (updates.rating !== undefined) updateData.rating = updates.rating
      if (updates.tags !== undefined) updateData.tags = updates.tags
      if (updates.interviewStatus !== undefined) updateData.interview_status = updates.interviewStatus
      if (updates.feedback !== undefined) updateData.feedback = updates.feedback
      
      // Handle timestamp safely: avoid sending empty string to timestamptz column
      if (updates.lastContacted !== undefined) {
        const lc = updates.lastContacted as any
        if (typeof lc === 'string' && lc.trim() === '') {
          // Skip updating last_contacted when empty string provided
        } else if (lc === null) {
          updateData.last_contacted = null
        } else {
          // If a date-like value is provided, normalize to ISO; otherwise, pass through
          const d = new Date(lc)
          updateData.last_contacted = isNaN(d.getTime()) ? lc : d.toISOString()
        }
      }
      
      // Always update the updated_at timestamp
      updateData.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('candidates')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Error updating candidate:', error)
        throw error
      }
      
      // Handle work experience separately if provided
      if (updates.workExperience && updates.workExperience.length > 0) {
        // First delete existing work experience entries for this candidate
        const { error: deleteError } = await supabase
          .from('work_experience')
          .delete()
          .eq('candidate_id', id)
          
        if (deleteError) {
          console.error('Error deleting existing work experience:', deleteError)
          throw deleteError
        }
        
        // Then insert new work experience entries
        for (const exp of updates.workExperience) {
          const { error: insertError } = await supabase
            .from('work_experience')
            .insert({
              candidate_id: id,
              company: exp.company || '',
              role: exp.role || '',
              duration: exp.duration || '',
              location: exp.location || '',
              description: exp.description || '',
              responsibilities: exp.responsibilities || '',
              achievements: exp.achievements || '',
              technologies: exp.technologies || [],
              start_date: exp.startDate || null,
              end_date: exp.endDate || null,
              is_current: exp.isCurrent || false
            })
            
          if (insertError) {
            console.error('Error inserting work experience:', insertError)
            throw insertError
          }
        }
      }
      
      // Handle education separately if provided
      if (updates.education && updates.education.length > 0) {
        // First delete existing education entries for this candidate
        const { error: deleteError } = await supabase
          .from('education')
          .delete()
          .eq('candidate_id', id)
          
        if (deleteError) {
          console.error('Error deleting existing education:', deleteError)
          throw deleteError
        }
        
        // Then insert new education entries
        for (const edu of updates.education) {
          const { error: insertError } = await supabase
            .from('education')
            .insert({
              candidate_id: id,
              degree: edu.degree || '',
              specialization: edu.specialization || '',
              institution: edu.institution || '',
              year: edu.year || '',
              percentage: edu.percentage || ''
            })
            
          if (insertError) {
            console.error('Error inserting education:', insertError)
            throw insertError
          }
        }
      }
    } catch (error) {
      console.error('Failed to update candidate:', error)
      throw error
    }
  }

  // Delete candidate
  static async deleteCandidate(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting candidate:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Failed to delete candidate:', error)
      throw error
    }
  }
  
  // Reparse candidate
  static async reparseCandidate(candidateId: string, fileUrl: string, fileName: string): Promise<boolean> {
    try {
      console.log(`=== Reparsing Candidate ${candidateId} from original file ===`)
      
      // Resolve a valid blob URL
      let resolvedUrl = fileUrl
      const looksLikeUrl = typeof resolvedUrl === "string" && /^https?:\/\//i.test(resolvedUrl)
      if (!looksLikeUrl) {
        console.log("URL is not a valid URL. Attempting to resolve via Supabase Storage...")
        // Try using filePath (often a pathname) first
        if (fileUrl && typeof fileUrl === "string") {
          const attempt1 = await this.checkFileExistsInStorage(fileUrl)
          if (attempt1.exists && attempt1.url) {
            resolvedUrl = attempt1.url
            console.log("Resolved from filePath/pathname:", resolvedUrl)
          }
        }
        // Try using provided fileName
        if (!/^https?:\/\//i.test(resolvedUrl) && fileName) {
          const attempt2 = await this.checkFileExistsInStorage(fileName)
          if (attempt2.exists && attempt2.url) {
            resolvedUrl = attempt2.url
            console.log("Resolved from fileName:", resolvedUrl)
          }
        }
        if (!/^https?:\/\//i.test(resolvedUrl)) {
          throw new Error(`Unable to resolve a valid file URL for reparsing. Got "${fileUrl}"`) 
        }
      }

      // Download the file
      const response = await fetch(resolvedUrl)
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
      }
      
      // Get the file content as buffer
      const buffer = await response.arrayBuffer()
      
      // Create a file-like object compatible with Node.js environment
      const file = {
        name: fileName,
        type: response.headers.get('content-type') || 'application/octet-stream',
        arrayBuffer: async () => buffer,
        text: async () => new TextDecoder().decode(buffer),
        size: buffer.byteLength
      }
      
      // Parse the resume
      const { parseResume } = require('./resume-parser')
      const parsedData = await parseResume(file)
      
      // Update the candidate with new parsed data
      await this.updateCandidate(candidateId, parsedData)
      
      return true
    } catch (error) {
      console.error('Failed to reparse candidate:', error)
      throw error
    }
  }
  
  // Check if file exists in storage
  static async checkFileExistsInStorage(filePath: string): Promise<{exists: boolean, url?: string}> {
    try {
      // Clean up the path - remove any leading slashes or bucket prefixes
      const cleanPath = filePath.replace(/^\/+/, '').replace(/^resume-files\//, '')
      
      // Try to get the public URL
      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(cleanPath)
      
      // Check if the file exists by making a HEAD request
      const response = await fetch(data.publicUrl, { method: 'HEAD' })
      
      return {
        exists: response.ok,
        url: response.ok ? data.publicUrl : undefined
      }
    } catch (error) {
      console.error('Error checking file existence:', error)
      return { exists: false }
    }
  }
  
  // Delete file from storage
  static async deleteFile(filePath: string): Promise<{error?: any}> {
    try {
      // Clean up the path - remove any leading slashes or bucket prefixes
      const cleanPath = filePath.replace(/^\/+/, '').replace(/^resume-files\//, '')
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([cleanPath])
      
      return { error }
    } catch (error) {
      console.error('Error deleting file:', error)
      return { error }
    }
  }

  // Search candidates using full-text search
  static async searchCandidates(query: string): Promise<ComprehensiveCandidateData[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_candidates', { search_query: query })

      if (error) {
        console.error('Error searching candidates:', error)
        throw error
      }

      // Get full candidate data for search results
      const candidateIds = (data || []).map((result: any) => result.id)
      
      if (candidateIds.length === 0) {
        return []
      }

      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .in('id', candidateIds)

      if (candidatesError) {
        console.error('Error fetching search results:', candidatesError)
        throw candidatesError
      }

      return (candidates || []).map(row => this.mapRowToCandidate(row))
    } catch (error) {
      console.error('Failed to search candidates:', error)
      throw error
    }
  }

  // Search candidates by skills
  static async searchCandidatesBySkills(skills: string[]): Promise<ComprehensiveCandidateData[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_candidates_by_skills', { skills })

      if (error) {
        console.error('Error searching candidates by skills:', error)
        throw error
      }

      // Get full candidate data for search results
      const candidateIds = (data || []).map((result: any) => result.id)
      
      if (candidateIds.length === 0) {
        return []
      }

      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .in('id', candidateIds)

      if (candidatesError) {
        console.error('Error fetching skill search results:', candidatesError)
        throw candidatesError
      }

      return (candidates || []).map(row => this.mapRowToCandidate(row))
    } catch (error) {
      console.error('Failed to search candidates by skills:', error)
      throw error
    }
  }

  // Get analytics/statistics
  static async getAnalytics(period = "all"): Promise<any> {
    try {
      // Get basic stats
      const { data: stats, error: statsError } = await supabase
        .rpc('get_candidate_stats')

      if (statsError) {
        console.error('Error fetching stats:', statsError)
        throw statsError
      }

      const statsData = stats?.[0] || {
        total_candidates: 0,
        new_candidates: 0,
        reviewed_candidates: 0,
        shortlisted_candidates: 0,
        selected_candidates: 0,
        rejected_candidates: 0
      }

      // Get recent uploads
      const { data: recentCandidates, error: recentError } = await supabase
        .from('candidates')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(10)

      if (recentError) {
        console.error('Error fetching recent candidates:', recentError)
        throw recentError
      }

      // Get breakdown by role
      const { data: roleBreakdown, error: roleError } = await supabase
        .from('candidates')
        .select('current_role')
        .not('current_role', 'is', null)

      if (roleError) {
        console.error('Error fetching role breakdown:', roleError)
        throw roleError
      }

      // Get breakdown by location
      const { data: locationBreakdown, error: locationError } = await supabase
        .from('candidates')
        .select('location')
        .not('location', 'is', null)

      if (locationError) {
        console.error('Error fetching location breakdown:', locationError)
        throw locationError
      }

      // Process breakdowns
      const roleStats = (roleBreakdown || []).reduce((acc: any, row: any) => {
        acc[row.current_role] = (acc[row.current_role] || 0) + 1
        return acc
      }, {})

      const locationStats = (locationBreakdown || []).reduce((acc: any, row: any) => {
        acc[row.location] = (acc[row.location] || 0) + 1
        return acc
      }, {})

      return {
        totalResumes: statsData.total_candidates,
        totalCandidates: statsData.total_candidates,
        statusBreakdown: {
          new: statsData.new_candidates,
          reviewed: statsData.reviewed_candidates,
          shortlisted: statsData.shortlisted_candidates,
          selected: statsData.selected_candidates,
          rejected: statsData.rejected_candidates,
        },
        roleBreakdown: roleStats,
        locationBreakdown: locationStats,
        recentUploads: (recentCandidates || []).map(candidate => this.mapRowToCandidate(candidate))
      }
    } catch (error) {
      console.error('Failed to get analytics:', error)
      throw error
    }
  }

  // Get candidate by ID (alias for getCandidate for backward compatibility)
  static async getCandidateById(id: string): Promise<ComprehensiveCandidateData | null> {
    return this.getCandidate(id);
  }

  // Upload file to Supabase Storage
  static async uploadFile(file: File, candidateId: string): Promise<string> {
    try {
      // Import the uploadFileToSupabase function from supabase-storage-utils
      const { uploadFileToSupabase } = require('./supabase-storage-utils');
      
      const fileExt = file.name.split('.').pop()
      
      // Generate a hash of the file content to use as part of the filename
      // This helps with deduplication and identification
      const fileBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      // Use the first 10 chars of hash in filename for identification
      const fileName = `${candidateId}-${hashHex.substring(0, 10)}.${fileExt}`
      
      console.log(`Uploading file to Supabase Storage: ${fileName}`)
      
      // Create a new Blob from the file to upload (since we already read it for hashing)
      const fileBlob = new Blob([new Uint8Array(fileBuffer)], { type: file.type })
      
      // Use the improved uploadFileToSupabase function
      const { url: publicUrl, path } = await uploadFileToSupabase(fileBlob, fileName);

      console.log(`✅ File uploaded to Supabase Storage: ${publicUrl}`)
      
      // Update candidate with file information
      await this.updateCandidate(candidateId, {
        fileName: file.name,
        fileUrl: publicUrl,
        fileSize: file.size,
        fileType: file.type,
      })

      return publicUrl
    } catch (error) {
      console.error('Failed to upload file:', error)
      throw error
    }
  }

  // Delete file from Supabase Storage
  static async deleteFile(filePath: string): Promise<{ error: any }> {
    try {
      // Import the deleteFileFromSupabase function from supabase-storage-utils
      const { deleteFileFromSupabase } = require('./supabase-storage-utils');
      
      console.log(`Deleting file from Supabase Storage: ${filePath}`)
      
      // Use the improved deleteFileFromSupabase function
      const result = await deleteFileFromSupabase(filePath);
      
      if (result.error) {
        console.error('Error deleting file from storage:', result.error)
        return { error: result.error }
      }

      console.log(`✅ File deleted from Supabase Storage: ${filePath}`)
      return { error: null }
    } catch (error) {
      console.error('Failed to delete file from storage:', error)
      return { error: error as Error }
    }
  }

  // Test connection
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('count')
        .limit(1)

      if (error) {
        console.error('Database connection failed:', error)
        return false
      }

      console.log('✅ Supabase connection successful')
      return true
    } catch (error) {
      console.error('Database connection failed:', error)
      return false
    }
  }
}
