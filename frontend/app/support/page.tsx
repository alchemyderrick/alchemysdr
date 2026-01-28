'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2, Sparkles, Copy, RefreshCw, MessageSquare, Send } from 'lucide-react'

export default function SupportBotPage() {
  const [supportMessage, setSupportMessage] = useState('')
  const [generatedResponse, setGeneratedResponse] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const handleGenerate = async () => {
    if (!supportMessage.trim()) {
      toast.error('Please paste a support message first')
      return
    }

    setLoading(true)
    try {
      toast.info('Generating support response with Claude...')
      const result = await api.post<{ response: string }>('/api/support/generate', {
        support_message: supportMessage.trim(),
      })
      setGeneratedResponse(result.response)
      setHasGenerated(true)
      setFeedback('')
      toast.success('Response generated!')
    } catch (error) {
      console.error('Failed to generate response:', error)
      toast.error('Failed to generate response')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!supportMessage.trim()) {
      toast.error('Please paste a support message first')
      return
    }

    setRegenerating(true)
    try {
      toast.info('Regenerating support response with Claude...')
      const result = await api.post<{ response: string }>('/api/support/generate', {
        support_message: supportMessage.trim(),
        current_response: generatedResponse,
        feedback: feedback.trim() || undefined,
      })
      setGeneratedResponse(result.response)
      setFeedback('')
      toast.success('Response regenerated!')
    } catch (error) {
      console.error('Failed to regenerate response:', error)
      toast.error('Failed to regenerate response')
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedResponse) return

    try {
      await navigator.clipboard.writeText(generatedResponse)
      toast.success('Copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleQuickFeedback = (quickFeedback: string) => {
    setFeedback(quickFeedback)
  }

  return (
    <div className="p-8 md:p-12 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Support Bot</h1>
        </div>
        <p className="text-muted-foreground">
          Generate Alchemy support responses using Claude + Alchemy documentation
        </p>
      </div>

      <div className="space-y-6">
        {/* Input Section */}
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-4 w-4" />
              Support Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Paste the customer's support message here..."
              className="min-h-[150px] bg-background"
            />
            <Button
              onClick={handleGenerate}
              disabled={loading || !supportMessage.trim()}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Response
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Response Section */}
        {hasGenerated && (
          <Card className="border border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Generated Response
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={generatedResponse}
                onChange={(e) => setGeneratedResponse(e.target.value)}
                className="min-h-[200px] bg-background"
              />

              {/* Quick feedback buttons */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">Quick Suggestions:</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickFeedback("Make it more technical - include specific API details and code examples")}
                    disabled={regenerating}
                    className="text-xs"
                  >
                    More Technical
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickFeedback("Make it shorter and more concise")}
                    disabled={regenerating}
                    className="text-xs"
                  >
                    Shorter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickFeedback("Make it friendlier and more conversational")}
                    disabled={regenerating}
                    className="text-xs"
                  >
                    Friendlier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickFeedback("Add relevant documentation links")}
                    disabled={regenerating}
                    className="text-xs"
                  >
                    Add Docs Links
                  </Button>
                </div>
              </div>

              {/* Custom feedback */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  Custom Feedback:
                  {regenerating && <span className="ml-2 text-primary">Regenerating with Claude...</span>}
                </div>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe how to improve this response (e.g., 'add code examples', 'mention webhooks', 'be more specific about rate limits')"
                  disabled={regenerating}
                  className="min-h-[80px] bg-background"
                />
              </div>

              <Button
                onClick={handleRegenerate}
                disabled={regenerating}
                variant="outline"
                className="w-full"
              >
                {regenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate with Feedback
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
