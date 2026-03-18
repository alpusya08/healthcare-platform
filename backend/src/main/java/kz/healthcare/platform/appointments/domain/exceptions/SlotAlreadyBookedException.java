package kz.healthcare.platform.appointments.domain.exceptions;

import kz.healthcare.platform.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class SlotAlreadyBookedException extends BusinessException {

    public SlotAlreadyBookedException() {
        super("Выбранный слот уже занят");
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}
