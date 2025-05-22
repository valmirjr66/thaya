import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { TextContentBlock } from 'openai/resources/beta/threads/messages.mjs';
import { Annotation } from 'src/types/gpt';

export class TextResponse {
    constructor(content: string, annotations?: Annotation[]) {
        this.content = content;
        this.annotations = annotations;
    }

    content: string;
    annotations?: Annotation[];
}

export default class ChatAssistant {
    private readonly logger: Logger = new Logger('ChatAssistant');
    private readonly assistantId: string;
    private readonly openaiClient: OpenAI = new OpenAI();

    constructor(assistantId: string) {
        this.assistantId = assistantId;
    }

    public async startThread(): Promise<string> {
        const thread = await this.openaiClient.beta.threads.create();
        return thread.id;
    }

    public async addMessageToThread(
        threadId: string,
        message: string,
    ): Promise<TextResponse> {
        await this.openaiClient.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message,
        });

        const run = await this.openaiClient.beta.threads.runs.createAndPoll(
            threadId,
            {
                assistant_id: this.assistantId,
            },
        );

        if (run.status === 'completed') {
            const messages = await this.openaiClient.beta.threads.messages.list(
                run.thread_id,
            );

            const responseContent = messages.data[0].content;

            // TODO: Remove this validation as it's only a temporary workaround
            // so I don't have to deal with all response types right now
            if (
                responseContent.length > 1 ||
                responseContent[0].type !== 'text'
            ) {
                throw new Error('Unknown response format');
            }

            return new TextResponse(
                responseContent[0].text.value,
                responseContent[0].text.annotations as Annotation[],
            );
        } else {
            this.logger.log(
                `Run status was: '${run.status}' on thread ${threadId}.
                Error is as following: ${run.last_error}`,
            );

            throw new Error("Run wasn't completed");
        }
    }

    public async addMessageToThreadByStream(
        threadId: string,
        message: string,
        streamingCallback: (
            textSnapshot: string,
            annotationsSnapshot: Annotation[],
            finished: boolean,
        ) => void,
    ): Promise<TextResponse> {
        await this.openaiClient.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message,
        });

        let response: TextResponse;

        const run = this.openaiClient.beta.threads.runs
            .stream(threadId, {
                assistant_id: this.assistantId,
            })
            .on('textCreated', () =>
                this.logger.log(
                    `TextCreated for thread '${threadId}' with following incoming message '${message}'`,
                ),
            )
            .on('textDelta', (_textDelta, snapshot) =>
                streamingCallback(
                    snapshot.value,
                    snapshot.annotations as Annotation[],
                    false,
                ),
            )
            .on('messageDone', async (message) => {
                const textContent = message.content[0] as TextContentBlock;

                streamingCallback(
                    textContent.text.value,
                    textContent.text.annotations as Annotation[],
                    true,
                );

                response = new TextResponse(
                    textContent.text.value,
                    textContent.text.annotations as Annotation[],
                );
            });

        await run.done();

        return response;
    }
}
