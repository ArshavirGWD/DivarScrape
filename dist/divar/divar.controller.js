"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DivarController = void 0;
const common_1 = require("@nestjs/common");
const divar_service_1 = require("./divar.service");
let DivarController = class DivarController {
    divarService;
    constructor(divarService) {
        this.divarService = divarService;
    }
    async search(city, q) {
        if (!city || !q)
            return { error: 'city and query parameters are required' };
        return this.divarService.collectAds(city, q);
    }
    async login(body) {
        console.log('body:', body);
        return this.divarService.login(body);
    }
};
exports.DivarController = DivarController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('city')),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DivarController.prototype, "search", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DivarController.prototype, "login", null);
exports.DivarController = DivarController = __decorate([
    (0, common_1.Controller)('divar'),
    __metadata("design:paramtypes", [divar_service_1.DivarService])
], DivarController);
//# sourceMappingURL=divar.controller.js.map