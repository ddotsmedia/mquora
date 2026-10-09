import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { DuplicateService } from './duplicate.service';

@Processor('duplicate-detection')
export class DuplicateProcessor {
  constructor(private duplicateService: DuplicateService) {}

  @Process({ concurrency: 2 })
  async processDuplicate(job: Job<{ postId: string }>) {
    return this.duplicateService.findDuplicates(job.data.postId);
  }
}
