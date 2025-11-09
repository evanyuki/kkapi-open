import { ErrorModal, SuccessModal } from 'src/Model/Response.modal';
import { TokenService } from 'src/modules/users/services/token.service';
import { Ispeak } from '../schema/ispeak.schema';
import { IspeakService } from '../service/ispeak.service';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { CreateIspeakDto } from '../dto/create-ispeak.dto';
import { UpdateIspeakDto } from '../dto/update-ispeak.dto';
export declare class IspeakController {
    private readonly ispeakService;
    private readonly tokenService;
    private readonly cloudinaryService;
    constructor(ispeakService: IspeakService, tokenService: TokenService, cloudinaryService: CloudinaryService);
    getSpeakByPage(req: any, query: any): Promise<SuccessModal | ErrorModal>;
    getIspeakByPage(query: any, req: any): Promise<SuccessModal>;
    addOneSpeak(req: any, body: CreateIspeakDto, files: any[]): Promise<SuccessModal | ErrorModal>;
    addOneSpeakByToken(body: Ispeak, files: any[]): Promise<SuccessModal | ErrorModal>;
    updateSpeak(body: UpdateIspeakDto, req: any, files: any[]): Promise<SuccessModal | ErrorModal>;
    updateSpeakStatus(body: any, req: any): Promise<SuccessModal | ErrorModal>;
    deleteOneSpeak(param: any): Promise<SuccessModal | ErrorModal>;
    getOneSpeak1(param: any): Promise<SuccessModal>;
}
