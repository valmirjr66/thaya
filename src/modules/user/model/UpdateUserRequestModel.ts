export default class UpdateUserRequestModel {
    constructor(
        public fullname: string,
        public email: string,
        public birthdate: string,
        public nickname?: string,
    ) {}
}
