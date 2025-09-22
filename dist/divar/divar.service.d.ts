export interface Ad {
    title: string;
    price: string;
    status: string;
    link: string;
    phone?: string;
}
export declare class DivarService {
    private page;
    private browser;
    initBrowser(): Promise<void>;
    login(body: {
        phone?: string;
    }): Promise<void>;
    collectAds(city: string, q: string): Promise<Ad[]>;
    private scroll;
    private mouseMove;
    private slowClick;
    private delay;
}
