import { DivarService } from './divar.service';
export declare class DivarController {
    private readonly divarService;
    constructor(divarService: DivarService);
    search(city: string, q: string): Promise<import("./divar.service").Ad[] | {
        error: string;
    }>;
    login(body: {
        phone: string;
    }): Promise<void>;
}
