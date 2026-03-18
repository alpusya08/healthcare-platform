package kz.healthcare.platform.appointments.domain.exceptions;

import kz.healthcare.platform.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class AppointmentNotCancellableException extends BusinessException {

    public AppointmentNotCancellableException() {
        super("Запись можно отменить только со статусом SCHEDULED");
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.UNPROCESSABLE_ENTITY;
    }
}
